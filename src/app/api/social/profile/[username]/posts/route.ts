import { bearerToken } from "@/lib/social/auth";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { getVerifiedUserId } from "@/lib/serverRoleCache";

export async function GET(request:Request,context:{params:Promise<{username:string}>}){try{
  const {username}=await context.params;
  const token=bearerToken(request);
  const viewerId=token?await getVerifiedUserId(token).catch(()=>null):null;
  const cursor=decodeSocialCursor(new URL(request.url).searchParams.get("cursor"));
  const profile=await socialQuery<{user_id:string}>("select user_id from social_profiles where lower(username)=lower($1)",[decodeURIComponent(username)]);
  if(!profile.rows[0])return socialJson({error:"Profil tidak ditemukan."},{status:404});
  const result=await socialQuery(`select p.id,p.author_id,p.content,p.image_url,p.likes_count,p.replies_count,p.created_at,p.edited_at,json_build_object('username',s.username,'avatar_url',s.avatar_url,'avatar_border',s.avatar_border,'level',s.level,'role',s.role,'is_premium',s.is_premium,'total_reads',s.total_reads) profiles from social_posts p join social_profiles s on s.user_id=p.author_id where p.author_id=$1 and p.parent_id is null
    and (p.visibility='public' or ($2::uuid is not null and (p.author_id=$2::uuid or exists(select 1 from social_follows f where f.follower_id=$2::uuid and f.following_id=p.author_id))))
    and ($3::timestamptz is null or (p.created_at,p.id)<($3::timestamptz,$4::uuid)) order by p.created_at desc,p.id desc limit 21`,[profile.rows[0].user_id,viewerId,cursor?.createdAt||null,cursor?.id||null]);
  const items=result.rows.slice(0,20);
  return socialJson({items,nextCursor:result.rows.length>20?encodeSocialCursor(items.at(-1)?.created_at as string,items.at(-1)?.id as string):null},{headers:token?{"Cache-Control":"private, no-store","Vary":"Authorization"}:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=120"}});
}catch(error){return socialError(error);}}

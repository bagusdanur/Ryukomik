import { bearerToken } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { getVerifiedUserId } from "@/lib/serverRoleCache";

// Aktivitas publik/followers user tertentu, untuk section Aktivitas di halaman profil.
// visibility='followers' hanya tampil kalau viewer adalah author atau pengikut.
export async function GET(request:Request,context:{params:Promise<{username:string}>}){try{
  const {username}=await context.params;
  const token=bearerToken(request);
  const viewerId=token?await getVerifiedUserId(token).catch(()=>null):null;
  const profile=await socialQuery<{user_id:string}>("select user_id from social_profiles where lower(username)=lower($1)",[decodeURIComponent(username)]);
  if(!profile.rows[0])return socialJson({error:"Profil tidak ditemukan."},{status:404});
  const actorId=profile.rows[0].user_id;
  const r=await socialQuery(`select id,event_type,entity_id,entity_label,created_at from social_activity_events where actor_id=$1
    and (visibility='public' or ($2::uuid is not null and visibility<>'private' and ($2::uuid=actor_id or exists(select 1 from social_follows f where f.follower_id=$2::uuid and f.following_id=actor_id))))
    order by created_at desc,id desc limit 21`,[actorId,viewerId]);
  return socialJson({items:r.rows.slice(0,20)},{headers:token?{"Cache-Control":"private, no-store","Vary":"Authorization"}:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=120"}});
}catch(error){return socialError(error);}}

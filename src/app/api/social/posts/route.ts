import { revalidateTag } from "next/cache";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { allowsSocialNotification } from "@/lib/social/notifications";
import { ensureSocialProfile } from "@/lib/social/profileSync";

function validMedia(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("https://")) throw new Error("INVALID_MEDIA");
  const url = new URL(value); if (["localhost","127.0.0.1","0.0.0.0","::1"].includes(url.hostname)) throw new Error("INVALID_MEDIA");
  return value;
}

export async function GET(request: Request) {
  try {
    const viewerId=await requireUserId(request); await ensureSocialProfile(viewerId);
    const url=new URL(request.url), scope=url.searchParams.get("scope")||"following", profileId=url.searchParams.get("userId"), parentId=url.searchParams.get("parentId"), cursor=decodeSocialCursor(url.searchParams.get("cursor"));
    const asc=Boolean(parentId), direction=asc?">":"<", order=asc?"asc":"desc";
    const result=await socialQuery(`select p.id,p.author_id,p.parent_id,p.content,p.image_url,p.visibility,p.likes_count,p.replies_count,p.created_at,p.updated_at,p.edited_at,
      json_build_object('username',sp.username,'avatar_url',sp.avatar_url,'level',sp.level,'role',sp.role,'is_premium',sp.is_premium) profiles,
      exists(select 1 from social_post_likes l where l.post_id=p.id and l.user_id=$1) viewer_liked,
      exists(select 1 from social_post_bookmarks k where k.post_id=p.id and k.user_id=$1) viewer_bookmarked,(p.author_id=$1) viewer_owns
      from social_posts p join social_profiles sp on sp.user_id=p.author_id
      where (($2::uuid is null and p.parent_id is null) or ($2::uuid is not null and p.parent_id=$2))
      and ($3<>'profile' or p.author_id=$4::uuid)
      and ($3<>'following' or p.author_id=$1 or exists(select 1 from social_follows f where f.follower_id=$1 and f.following_id=p.author_id))
      and ($3 not in ('public','explore') or p.visibility='public')
      and (p.visibility='public' or p.author_id=$1 or exists(select 1 from social_follows f where f.follower_id=$1 and f.following_id=p.author_id))
      and not exists(select 1 from social_mutes m where m.user_id=$1 and m.muted_id=p.author_id)
      and not exists(select 1 from social_blocks b where (b.blocker_id=$1 and b.blocked_id=p.author_id) or (b.blocker_id=p.author_id and b.blocked_id=$1))
      and ($5::timestamptz is null or (p.created_at,p.id) ${direction} ($5::timestamptz,$6::uuid)) order by p.created_at ${order},p.id ${order} limit 21`,
      [viewerId,parentId||null,scope,profileId||null,cursor?.createdAt||null,cursor?.id||null]);
    const items=result.rows.slice(0,20);
    return socialJson({items,nextCursor:result.rows.length>20?encodeSocialCursor(items.at(-1)?.created_at as string,items.at(-1)?.id as string):null},{headers:{"Cache-Control":"private, no-store, max-age=0",Vary:"Authorization"}});
  } catch(error){return socialError(error);}
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const userId=await requireUserId(request); await ensureSocialProfile(userId);
    if(!socialLimit(request,userId,12)) return socialJson({error:"Terlalu banyak posting."},{status:429});
    const body=await request.json() as {content?:string;image_url?:string;visibility?:string;parent_id?:string};
    const media=validMedia(body.image_url), content=body.content?.trim().slice(0,500)||(media?"[sticker]":"");
    if(!content)return socialJson({error:"Posting tidak boleh kosong."},{status:400});
    const visibility=body.visibility==="followers"?"followers":"public";
    let parent:{id:string;author_id:string}|undefined;
    if(body.parent_id){const found=await socialQuery<{id:string;author_id:string}>("select id,author_id from social_posts where id=$1 and parent_id is null",[body.parent_id]);parent=found.rows[0];if(!parent)return socialJson({error:"Posting induk tidak ditemukan."},{status:404});await ensureSocialProfile(parent.author_id);}
    const notify=parent&&parent.author_id!==userId?await allowsSocialNotification(parent.author_id,"replies"):false;
    const post=await socialTransaction(async client=>{const actor=await client.query<{username:string;avatar_url:string|null;level:number;role:string|null;is_premium:boolean}>("select username,avatar_url,level,role,is_premium from social_profiles where user_id=$1",[userId]);const profile=actor.rows[0]||{username:"User",avatar_url:null,level:1,role:null,is_premium:false};const name=profile.username;const inserted=await client.query<{id:string;author_id:string;created_at:string}>("insert into social_posts(author_id,parent_id,content,image_url,visibility) values($1,$2,$3,$4,$5) returning id,author_id,created_at",[userId,parent?.id||null,content,media,visibility]);if(parent&&notify)await client.query("insert into social_notifications(user_id,actor_id,actor_name,type,target_id) values($1,$2,$3,'social_reply',$4)",[parent.author_id,userId,name,parent.id]);await client.query("insert into social_activity_events(actor_id,actor_name,event_type,entity_id,entity_label,visibility) values($1,$2,$3,$4,$5,$6)",[userId,name,parent?"replied_post":"created_post",inserted.rows[0].id,content.slice(0,80),visibility]);return {...inserted.rows[0],profiles:profile};});
    revalidateTag("social-posts",{expire:0});return socialJson({post},{status:201});
  }catch(error){if(error instanceof Error&&error.message==="INVALID_MEDIA")return socialJson({error:"Gambar wajib URL HTTPS publik."},{status:400});return socialError(error);}
}

export async function DELETE(request: Request){try{assertSameOrigin(request);const userId=await requireUserId(request),{id}=await request.json() as {id?:string};if(!id)return socialJson({error:"ID posting diperlukan."},{status:400});await socialQuery("delete from social_posts where id=$1 and author_id=$2",[id,userId]);revalidateTag("social-posts",{expire:0});return socialJson({success:true});}catch(error){return socialError(error);}}

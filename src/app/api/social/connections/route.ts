import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { ensureSocialProfile } from "@/lib/social/profileSync";

export async function GET(request:Request){try{const viewerId=await requireUserId(request);await ensureSocialProfile(viewerId);const url=new URL(request.url),userId=url.searchParams.get("userId")||viewerId,mode=url.searchParams.get("mode")==="following"?"following":"followers",cursor=url.searchParams.get("cursor");const owner=mode==="followers"?"following_id":"follower_id",target=mode==="followers"?"follower_id":"following_id";const result=await socialQuery(`select p.user_id as id,p.username,p.avatar_url,p.bio,p.level,p.is_premium,f.created_at from social_follows f join social_profiles p on p.user_id=f.${target} where f.${owner}=$1 and ($2::timestamptz is null or f.created_at<$2) order by f.created_at desc limit 21`,[userId,cursor]);const items=result.rows.slice(0,20);return socialJson({items,nextCursor:result.rows.length>20?items.at(-1)?.created_at:null});}catch(error){return socialError(error);}}

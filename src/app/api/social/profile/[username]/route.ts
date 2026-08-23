import { bearerToken } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { getVerifiedUserId } from "@/lib/serverRoleCache";

export async function GET(request:Request,context:{params:Promise<{username:string}>}){try{const {username}=await context.params;const result=await socialQuery(`select p.user_id as id,p.username,p.avatar_url,p.banner_url,p.bio,p.level,p.role,p.is_premium,p.created_at,
    (select count(*)::int from social_follows f where f.following_id=p.user_id) followers,
    (select count(*)::int from social_follows f where f.follower_id=p.user_id) following,
    (select count(*)::int from social_collections c where c.user_id=p.user_id and c.visibility='public') collections
    from social_profiles p where lower(p.username)=lower($1) limit 1`,[decodeURIComponent(username)]);const profile=result.rows[0];if(!profile)return socialJson({error:"Profil tidak ditemukan."},{status:404});let viewerFollowing=false;const token=bearerToken(request);if(token){const viewerId=await getVerifiedUserId(token).catch(()=>null);if(viewerId){const followed=await socialQuery("select 1 from social_follows where follower_id=$1 and following_id=$2",[viewerId,profile.id]);viewerFollowing=Boolean(followed.rowCount);}}return socialJson({profile,viewerFollowing},{headers:{"Cache-Control":token?"private, no-store":"public, s-maxage=300, stale-while-revalidate=300"}});}catch(error){return socialError(error);}}

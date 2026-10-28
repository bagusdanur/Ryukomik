import { bearerToken } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { getVerifiedUserId } from "@/lib/serverRoleCache";

export async function GET(request:Request,context:{params:Promise<{username:string}>}){try{const {username}=await context.params;const result=await socialQuery(`select p.user_id as id,p.username,p.avatar_url,p.avatar_border,p.banner_url,p.bio,p.level,p.xp,p.role,p.is_premium,p.premium_until,p.total_reads,p.total_comments,p.created_at,p.show_public_reads,p.show_public_comments,p.show_public_join_date,
    (select count(*)::int from social_follows f where f.following_id=p.user_id) followers,
    (select count(*)::int from social_follows f where f.follower_id=p.user_id) following,
    (select count(*)::int from social_collections c where c.user_id=p.user_id and c.visibility='public') collections
    from social_profiles p where lower(p.username)=lower($1) limit 1`,[decodeURIComponent(username)]);const row=result.rows[0] as Record<string, any>;if(!row)return socialJson({error:"Profil tidak ditemukan."},{status:404});
  // Hormati preferensi privasi pemilik profil: sembunyikan angka, jangan hapus
  // fieldnya supaya klien tidak perlu menebak.
  const profile: Record<string, any> = {...row,
    total_reads: row.show_public_reads === false ? null : row.total_reads,
    total_comments: row.show_public_comments === false ? null : row.total_comments,
    created_at: row.show_public_join_date === false ? null : row.created_at,
  };let viewerFollowing=false;const token=bearerToken(request);if(token){const viewerId=await getVerifiedUserId(token).catch(()=>null);if(viewerId){const followed=await socialQuery("select 1 from social_follows where follower_id=$1 and following_id=$2",[viewerId,profile.id]);viewerFollowing=Boolean(followed.rowCount);}}return socialJson({profile,viewerFollowing},{headers:{"Cache-Control":token?"private, no-store":"public, s-maxage=300, stale-while-revalidate=300"}});}catch(error){return socialError(error);}}

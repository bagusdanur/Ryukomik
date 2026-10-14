import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";

// Koleksi publik milik user tertentu, untuk section Koleksi di halaman profil.
export async function GET(request:Request,context:{params:Promise<{username:string}>}){try{
  const {username}=await context.params;
  const profile=await socialQuery<{user_id:string}>("select user_id from social_profiles where lower(username)=lower($1)",[decodeURIComponent(username)]);
  if(!profile.rows[0])return socialJson({error:"Profil tidak ditemukan."},{status:404});
  const r=await socialQuery("select id,name,description,cover_url,items_count,updated_at from social_collections where user_id=$1 and visibility='public' order by updated_at desc limit 12",[profile.rows[0].user_id]);
  return socialJson({items:r.rows},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=120"}});
}catch(error){return socialError(error);}}

import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";

// Koleksi publik milik user tertentu, untuk section Koleksi di halaman profil.
export async function GET(request:Request,context:{params:Promise<{username:string}>}){try{
  const {username}=await context.params;
  const profile=await socialQuery<{user_id:string}>("select user_id from social_profiles where lower(username)=lower($1)",[decodeURIComponent(username)]);
  if(!profile.rows[0])return socialJson({error:"Profil tidak ditemukan."},{status:404});
  const r=await socialQuery("select coalesce(c.cover_url,(select image from social_collection_items i where i.collection_id=c.id and i.image is not null order by i.position desc,i.created_at desc limit 1)) cover_url,c.id,c.name,c.description,c.items_count,c.updated_at from social_collections c where c.user_id=$1 and c.visibility='public' order by c.updated_at desc limit 12",[profile.rows[0].user_id]);
  return socialJson({items:r.rows},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=120"}});
}catch(error){return socialError(error);}}

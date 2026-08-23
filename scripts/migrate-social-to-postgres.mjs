import "dotenv/config";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl=process.env.SOCIAL_DATABASE_URL;
if(!url||!key||!databaseUrl)throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SOCIAL_DATABASE_URL are required");
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const pool=new pg.Pool({connectionString:databaseUrl,max:3});

async function all(table,columns="*"){const rows=[];for(let from=0;;from+=1000){const {data,error}=await supabase.from(table).select(columns).range(from,from+999);if(error)throw new Error(`${table}: ${error.message}`);rows.push(...(data||[]));if(!data||data.length<1000)break;}return rows;}
async function insert(table,columns,rows){if(!rows.length)return;for(let i=0;i<rows.length;i+=200){const chunk=rows.slice(i,i+200),values=[],params=[];for(const row of chunk){const offset=params.length;for(const column of columns)params.push(row[column]??null);values.push(`(${columns.map((_,index)=>`$${offset+index+1}`).join(",")})`);}await pool.query(`insert into ${table}(${columns.join(",")}) values ${values.join(",")} on conflict do nothing`,params);}console.log(`${table}: ${rows.length}`);}

try{
  const profiles=await all("profiles","id,username,avatar_url,banner_url,bio,level,role,is_premium");
  await insert("social_profiles",["user_id","username","avatar_url","banner_url","bio","level","role","is_premium","source_updated_at"],profiles.map(p=>({...p,user_id:p.id,username:p.username||`user-${p.id.slice(0,8)}`})));
  const jobs=[
    ["user_follows","social_follows",["follower_id","following_id","created_at"]],
    ["user_blocks","social_blocks",["blocker_id","blocked_id","created_at"]],
    ["user_mutes","social_mutes",["user_id","muted_id","created_at"]],
    ["social_posts","social_posts",["id","author_id","parent_id","content","image_url","visibility","likes_count","replies_count","created_at","updated_at","edited_at"]],
    ["social_post_likes","social_post_likes",["post_id","user_id","created_at"]],
    ["social_post_bookmarks","social_post_bookmarks",["post_id","user_id","created_at"]],
    ["activity_events","social_activity_events",["actor_id","actor_name","event_type","entity_id","entity_label","visibility","created_at"]],
    ["social_notification_preferences","social_notification_preferences",["user_id","follows","likes","replies","mentions","collections","updated_at"]],
    ["social_reports","social_reports",["reporter_id","target_type","target_id","reason","status","moderator_id","moderator_note","resolved_at","created_at"]],
    ["user_collections","social_collections",["id","user_id","name","description","cover_url","visibility","items_count","created_at","updated_at"]],
    ["user_collection_items","social_collection_items",["collection_id","user_id","source","slug","title","image","position","created_at"]],
  ];
  for(const [source,target,columns] of jobs)await insert(target,columns,await all(source,columns.join(",")));
  const notifications=await all("notifications","user_id,actor_id,actor_name,type,slug,chapter,target_id,is_read,read_at,created_at");
  await insert("social_notifications",["user_id","actor_id","actor_name","type","slug","chapter","target_id","is_read","read_at","created_at"],notifications.filter(n=>["new_follower","social_like","social_reply","social_mention","social_collection"].includes(n.type)));
  await pool.query("update social_posts p set likes_count=(select count(*) from social_post_likes l where l.post_id=p.id),replies_count=(select count(*) from social_posts r where r.parent_id=p.id)");
  await pool.query("update social_collections c set items_count=(select count(*) from social_collection_items i where i.collection_id=c.id)");
  console.log("Social migration completed");
}finally{await pool.end();}

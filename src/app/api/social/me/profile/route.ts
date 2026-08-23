import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { ensureSocialProfile } from "@/lib/social/profileSync";

function mediaUrl(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_MEDIA");
  const trimmed=value.trim(); if(trimmed.length>2048||!trimmed.startsWith("https://"))throw new Error("INVALID_MEDIA");
  const url=new URL(trimmed); if(["localhost","127.0.0.1","0.0.0.0","::1"].includes(url.hostname))throw new Error("INVALID_MEDIA");
  return trimmed;
}

export async function GET(request:Request){try{const userId=await requireUserId(request);await ensureSocialProfile(userId);const result=await socialQuery("select user_id as id,username,avatar_url,banner_url,bio,level from social_profiles where user_id=$1",[userId]);return socialJson({profile:result.rows[0]||null},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return socialError(error);}}

export async function PATCH(request:Request){try{assertSameOrigin(request);const userId=await requireUserId(request);await ensureSocialProfile(userId);if(!socialLimit(request,userId,10))return socialJson({error:"Terlalu banyak perubahan."},{status:429});const body=await request.json() as Record<string,unknown>;const bio=typeof body.bio==="string"?body.bio.trim().slice(0,280)||null:null;const banner=mediaUrl(body.banner_url);await socialQuery("update social_profiles set bio=$2,banner_url=$3,updated_at=now() where user_id=$1",[userId,bio,banner]);return socialJson({success:true});}catch(error){if(error instanceof Error&&error.message==="INVALID_MEDIA")return socialJson({error:"Banner wajib berupa URL HTTPS publik."},{status:400});return socialError(error);}}

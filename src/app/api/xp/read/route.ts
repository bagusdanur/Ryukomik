import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";
export const runtime = "nodejs";

export async function POST(request:Request){
  try{
    const userId=await requireUserId(request);
    const body=await request.json().catch(()=>null) as {chapter_slugs?:unknown}|null;
    const chapterSlugs=Array.isArray(body?.chapter_slugs)?[...new Set(body.chapter_slugs.filter((s):s is string=>typeof s==="string").map((s)=>s.trim()).filter(Boolean))].slice(0,20):[];
    if(!chapterSlugs.length)return NextResponse.json({error:"invalid"},{status:400});
    const {data,error}=await supabaseAdmin.rpc("record_user_reads_batch",{p_user_id:userId,p_chapter_slugs:chapterSlugs,p_xp_amount:5});
    if(error)throw error;
    const result=Array.isArray(data)?data[0]:data;
    return NextResponse.json({success:true,recorded_count:result?.recorded_count||0,xp_added:result?.xp_added||0});
  }catch(error){
    const unauthorized=error instanceof Error&&error.message==="UNAUTHORIZED";
    if(!unauthorized)console.error("[XP Read Batch] Error:",error);
    return NextResponse.json({error:unauthorized?"unauthorized":"failed"},{status:unauthorized?401:500});
  }
}

"use client";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface UseXpReadArgs { user: User | null; slugStr: string }
interface XpQueueItem { user_id: string; chapter_slug: string; retryCount: number }
const QUEUE_KEY = "xp_queue", BATCH_SIZE = 10, MAX_BATCH = 20, FLUSH_MS = 5 * 60 * 1000;
const sentReads = new Set<string>();
let flushPromise: Promise<void> | null = null;

function readStringArray(key: string): string[] { try { const v=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[]; } catch { return []; } }
function readQueue(): XpQueueItem[] { try { const v=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]"); return Array.isArray(v)?v.filter((x)=>x?.user_id&&x?.chapter_slug):[]; } catch { return []; } }
function writeQueue(items: XpQueueItem[]) { if(items.length)localStorage.setItem(QUEUE_KEY,JSON.stringify(items.slice(-100))); else localStorage.removeItem(QUEUE_KEY); }
function dailyKey(){return `xp_tracked_${new Date().toISOString().split("T")[0]}`;}
function alreadyTracked(uid:string,slug:string){return sentReads.has(`${uid}:${slug}`)||readStringArray(dailyKey()).includes(slug);}
function markTracked(uid:string,slugs:string[]){const done=new Set(readStringArray(dailyKey())); for(const slug of slugs){sentReads.add(`${uid}:${slug}`);done.add(slug);} localStorage.setItem(dailyKey(),JSON.stringify([...done].slice(-200)));}

function enqueue(uid:string,slug:string){
  if(alreadyTracked(uid,slug))return;
  sentReads.add(`${uid}:${slug}`);
  const queue=readQueue();
  if(!queue.some((x)=>x.user_id===uid&&x.chapter_slug===slug)){queue.push({user_id:uid,chapter_slug:slug,retryCount:0});writeQueue(queue);}
  if(queue.filter((x)=>x.user_id===uid).length>=BATCH_SIZE)void flushXpQueue(uid);
}

async function flushXpQueue(uid:string){
  if(flushPromise)return flushPromise;
  flushPromise=(async()=>{
    const selected=readQueue().filter((x)=>x.user_id===uid).slice(0,MAX_BATCH);
    if(!selected.length)return;
    const {data}=await supabase.auth.getSession(); const token=data.session?.access_token; if(!token)return;
    const slugs=[...new Set(selected.map((x)=>x.chapter_slug))];
    try{
      const response=await fetch("/api/xp/read",{method:"POST",headers:{"Content-Type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify({chapter_slugs:slugs}),keepalive:true});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      markTracked(uid,slugs); const sent=new Set(slugs);
      writeQueue(readQueue().filter((x)=>x.user_id!==uid||!sent.has(x.chapter_slug)));
    }catch{
      const attempted=new Set(slugs);
      writeQueue(readQueue().flatMap((x)=>x.user_id!==uid||!attempted.has(x.chapter_slug)?[x]:x.retryCount<3?[{...x,retryCount:x.retryCount+1}]:[]));
    }
  })().finally(()=>{flushPromise=null;});
  return flushPromise;
}

export function useXpRead({user,slugStr}:UseXpReadArgs){const uid=user?.id;useEffect(()=>{if(!uid||!slugStr||alreadyTracked(uid,slugStr))return;const timer=window.setTimeout(()=>enqueue(uid,slugStr),30_000);return()=>window.clearTimeout(timer);},[uid,slugStr]);}
export function useXpQueueFlush(){useEffect(()=>{let stopped=false;const flush=async()=>{if(stopped)return;const {data}=await supabase.auth.getSession();if(data.session?.user.id)await flushXpQueue(data.session.user.id);};const interval=window.setInterval(()=>void flush(),FLUSH_MS);const onVisibility=()=>{if(document.visibilityState==="hidden")void flush();};document.addEventListener("visibilitychange",onVisibility);void flush();return()=>{stopped=true;window.clearInterval(interval);document.removeEventListener("visibilitychange",onVisibility);};},[]);}

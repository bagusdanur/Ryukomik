import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pool, query } from './db.js';
import { changeChapterLocks } from './chapterLocks.js';
const app = express(); const port = Number(process.env.PROJECT_API_PORT || 4100);
app.use(cors()); app.use(express.json({ limit: '2mb' }));
const auth = (req: express.Request, res: express.Response, next: express.NextFunction) => { if (!process.env.PROJECT_API_INTERNAL_TOKEN || req.header('authorization') !== `Bearer ${process.env.PROJECT_API_INTERNAL_TOKEN}`) return res.status(401).json({ error: 'Unauthorized' }); next(); };
const logActivity = async (action:string, entityType:string, entityId:string|null, mangaSlug:string|null, detail:Record<string,unknown>={}) => { await query('insert into project_activity_log(action,entity_type,entity_id,manga_slug,detail) values($1,$2,$3,$4,$5)',[action,entityType,entityId,mangaSlug,JSON.stringify(detail)]); };
const latestBackup = () => { const dir=process.env.PROJECT_BACKUP_DIR||'/home/ryukomik/backups/ryukomik-project'; try { const files=readdirSync(dir).filter((name)=>name.endsWith('.dump')).map((name)=>{const path=join(dir,name);const stat=statSync(path);return{name,path,size:stat.size,mtime:stat.mtime,mtimeMs:stat.mtimeMs};}).filter((item)=>item.size>0).sort((a,b)=>b.mtimeMs-a.mtimeMs); return files[0]||null; } catch { return null; } };
app.get('/health', async (_req, res) => { try { await query('select 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); } });
app.get('/projects', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const type = String(req.query.type || '').trim();
  const status = String(req.query.status || '').trim();
  const genre = String(req.query.genre || '').trim();
  const genre2 = String(req.query.genre2 || '').trim();
  const conditions = ['m.is_published=true', 'm.deleted_at is null'];
  const values: unknown[] = [];
  if (type) { values.push(type); conditions.push(`lower(coalesce(m.type,'')) = lower($${values.length})`); }
  if (status) { values.push(status); conditions.push(`lower(coalesce(m.status,'')) = lower($${values.length})`); }
  for (const selectedGenre of [genre, genre2].filter(Boolean)) {
    values.push(selectedGenre);
    conditions.push(`exists (select 1 from jsonb_array_elements_text(coalesce(m.genres,'[]'::jsonb)) g(value) where lower(g.value) = lower($${values.length}))`);
  }
  const where = conditions.join(' and ');
  const offsetPosition = values.length + 1;
  const limitPosition = values.length + 2;
  const [rows, count] = await Promise.all([
    query(`select m.id,m.slug,m.title,m.cover_url,m.type,m.status,m.author,m.genres,m.updated_at,c.chapter_number as latest_chapter,c.uploaded_at as latest_chapter_uploaded_at,(select count(*)::int from project_upvotes u where u.manga_slug=m.slug) as upvote_count from project_manga m left join lateral (select chapter_number,uploaded_at from project_chapters where manga_slug=m.slug and is_published=true order by chapter_number desc limit 1) c on true where ${where} order by coalesce(c.uploaded_at,m.updated_at) desc offset $${offsetPosition} limit $${limitPosition}`, [...values, (page - 1) * limit, limit]),
    query(`select count(*)::int as total from project_manga m where ${where}`, values),
  ]);
  const total = count.rows[0]?.total || 0;
  res.json({ success: true, data: rows.rows, total, hasMore: page * limit < total });
});
app.get('/projects/filters', async (_req, res) => {
  const [types, statuses, genres] = await Promise.all([
    query("select distinct type as value from project_manga where is_published=true and deleted_at is null and coalesce(type,'')<>'' order by value"),
    query("select distinct status as value from project_manga where is_published=true and deleted_at is null and coalesce(status,'')<>'' order by value"),
    query("select distinct g.value from project_manga m cross join lateral jsonb_array_elements_text(coalesce(m.genres,'[]'::jsonb)) g(value) where m.is_published=true and m.deleted_at is null and g.value<>'' order by g.value"),
  ]);
  const options = (rows: unknown[], placeholder: string) => [{ value: '', label: placeholder }, ...rows.map((row) => String((row as {value?:unknown}).value || '')).filter(Boolean).map((value) => ({ value, label: value }))];
  const genreOptions = options(genres.rows, 'Genre');
  res.json({ success: true, data: { tipe: options(types.rows, 'Tipe'), status: options(statuses.rows, 'Status'), genre: genreOptions, genre2: [{ value: '', label: 'Genre 2' }, ...genreOptions.slice(1)] } });
});
app.get('/projects/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const tokens = [...new Set(q.toLocaleLowerCase('id-ID').match(/[\p{L}\p{N}]+/gu) || [])]
    .filter((token) => token.length >= 2)
    .slice(0, 8);
  const patterns = tokens.map((token) => '%' + token + '%');
  const result = await query(
    'select m.id, m.slug, m.title, m.cover_url, m.type, m.status, c.chapter_number as latest_chapter from project_manga m left join lateral (select chapter_number from project_chapters where manga_slug=m.slug and is_published=true order by chapter_number desc limit 1) c on true where m.is_published = true and m.deleted_at is null and m.title ilike all($1::text[]) order by case when m.title ilike $2 then 0 else 1 end, m.updated_at desc limit $3',
    [patterns, '%' + q + '%', limit + 1],
  );
  res.json({ success: true, data: result.rows.slice(0, limit), hasMore: result.rows.length > limit });
});
app.get('/projects/spotlight', async (_req, res) => { const result = await query('select m.slug,m.title,m.cover_url,m.type,m.status,m.genres,(select c.chapter_number from project_chapters c where c.manga_slug=m.slug and c.is_published=true order by c.chapter_number desc limit 1) latest_chapter from project_manga m where m.is_published=true and m.is_spotlight=true and m.deleted_at is null order by m.updated_at desc'); res.json({ data: result.rows }); });
app.get('/projects/:slug', async (req, res) => { const manga = await query("select m.id,m.slug,m.title,m.cover_url,m.description,m.type,m.status,m.author,m.genres,m.is_published,m.updated_at,(select count(*)::int from project_upvotes u where u.manga_slug=m.slug) as upvote_count,(select jsonb_build_object('suka',count(*) filter(where reaction_type='suka'),'semangat',count(*) filter(where reaction_type='semangat'),'keren',count(*) filter(where reaction_type='keren'),'ditunggu',count(*) filter(where reaction_type='ditunggu')) from project_upvotes u where u.manga_slug=m.slug) as reaction_counts from project_manga m where m.slug = $1 and m.is_published = true and m.deleted_at is null limit 1", [req.params.slug]); if (!manga.rows[0]) return res.status(404).json({ success: false, error: 'Project not found' }); const chapters = await query('select id, chapter_number, title, uploaded_at, view_count, premium_lock_started_at, premium_lock_until from project_chapters where manga_slug = $1 and is_published = true order by chapter_number desc', [req.params.slug]); res.json({ success: true, data: { ...manga.rows[0], chapters: chapters.rows } }); });
app.get('/projects/:slug/chapter-views', async (req, res) => { const result = await query('select c.chapter_number::text, c.view_count from project_chapters c join project_manga m on m.slug=c.manga_slug where c.manga_slug=$1 and c.is_published=true and m.is_published=true and m.deleted_at is null order by c.chapter_number desc', [req.params.slug]); if (!result.rows.length) { const manga=await query('select 1 from project_manga where slug=$1 and is_published=true and deleted_at is null',[req.params.slug]); if(!manga.rows[0])return res.status(404).json({error:'Project not found'}); } res.json({data:result.rows}); });
app.get('/projects/:slug/chapters/:chapter', auth, async (req, res) => { const chapterNum = parseFloat(String(req.params.chapter)); if (isNaN(chapterNum)) return res.status(400).json({ success: false, error: 'Invalid chapter number' }); const [current, nextRow, prevRow] = await Promise.all([query('select c.chapter_number, c.title, c.image_urls, c.premium_lock_started_at, c.premium_lock_until from project_chapters c join project_manga m on m.slug=c.manga_slug where c.manga_slug = $1 and c.chapter_number = $2 and c.is_published = true and m.is_published = true and m.deleted_at is null limit 1', [req.params.slug, chapterNum]), query('select chapter_number from project_chapters where manga_slug=$1 and is_published=true and chapter_number>$2 order by chapter_number asc limit 1', [req.params.slug, chapterNum]), query('select chapter_number from project_chapters where manga_slug=$1 and is_published=true and chapter_number<$2 order by chapter_number desc limit 1', [req.params.slug, chapterNum])]); if (!current.rows[0]) return res.status(404).json({ success: false, error: 'Chapter not found' }); const slug = req.params.slug; res.json({ success: true, data: { ...current.rows[0], prev: prevRow.rows[0] ? `${slug}/chapter-${prevRow.rows[0].chapter_number}` : null, next: nextRow.rows[0] ? `${slug}/chapter-${nextRow.rows[0].chapter_number}` : null } }); });
app.post('/projects/:slug/chapters/:chapter/view', async (req, res) => {
  const chapterNumber = Number(req.params.chapter);
  if (!Number.isFinite(chapterNumber) || chapterNumber < 0) return res.status(400).json({ error: 'Invalid chapter number' });
  const result = await query(
    `with chapter_update as (
       update project_chapters c
       set view_count = c.view_count + 1
       from project_manga m
       where c.manga_slug = $1 and c.chapter_number = $2
         and c.is_published = true and m.slug = c.manga_slug
         and m.is_published = true and m.deleted_at is null
       returning c.manga_slug, c.chapter_number
     ), manga_update as (
       update project_manga m
       set view_count = m.view_count + 1
       where m.slug = $1 and exists(select 1 from chapter_update)
       returning m.slug
     )
     insert into project_view_analytics(manga_slug, chapter_number, viewer_hash)
     select manga_slug, chapter_number, $3 from chapter_update
     returning manga_slug`,
    [req.params.slug, chapterNumber, req.body?.viewerHash || null],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Published chapter not found' });
  res.status(204).end();
});
// Kept temporarily for older deployed clients. New readers use the chapter endpoint above.
app.post('/projects/:slug/view', async (req, res) => { const updated=await query('update project_manga set view_count = view_count + 1 where slug = $1 and deleted_at is null returning slug', [req.params.slug]); if(!updated.rows[0])return res.status(404).json({error:'Project not found'}); await query('insert into project_view_analytics(manga_slug, viewer_hash) values ($1, $2)', [req.params.slug, req.body?.viewerHash || null]); res.status(204).end(); });
const projectReactionSummary=async(slug:string,userId:string)=>{const result=await query("select (select reaction_type from project_upvotes where manga_slug=$1 and user_id=$2) as selected_reaction,count(*)::int as upvote_count,jsonb_build_object('suka',count(*) filter(where reaction_type='suka'),'semangat',count(*) filter(where reaction_type='semangat'),'keren',count(*) filter(where reaction_type='keren'),'ditunggu',count(*) filter(where reaction_type='ditunggu')) as reaction_counts from project_upvotes where manga_slug=$1",[slug,userId]);return result.rows[0];};
app.get('/projects/:slug/upvote', auth, async (req,res)=>{const userId=String(req.query.userId||'');if(!/^[0-9a-f-]{36}$/i.test(userId))return res.status(400).json({error:'Invalid user'});res.json(await projectReactionSummary(String(req.params.slug),userId));});
app.post('/projects/:slug/upvote', auth, async (req,res)=>{const slug=String(req.params.slug);const userId=String(req.body?.userId||'');const reactionType=String(req.body?.reactionType||'');const allowed=['suka','semangat','keren','ditunggu'];if(!/^[0-9a-f-]{36}$/i.test(userId))return res.status(400).json({error:'Invalid user'});if(!allowed.includes(reactionType))return res.status(400).json({error:'Invalid reaction'});const manga=await query('select slug from project_manga where slug=$1 and is_published=true and deleted_at is null',[slug]);if(!manga.rows[0])return res.status(404).json({error:'Project not found'});const current=await query('select reaction_type from project_upvotes where manga_slug=$1 and user_id=$2',[slug,userId]);if(current.rows[0]?.reaction_type===reactionType)await query('delete from project_upvotes where manga_slug=$1 and user_id=$2',[slug,userId]);else await query('insert into project_upvotes(manga_slug,user_id,reaction_type) values($1,$2,$3) on conflict(manga_slug,user_id) do update set reaction_type=excluded.reaction_type,created_at=now()',[slug,userId,reactionType]);res.json(await projectReactionSummary(slug,userId));});
app.use('/admin', auth);
app.get('/admin/status', async (_req, res) => { const [size, mangas, chapters, views] = await Promise.all([query("select pg_size_pretty(pg_database_size(current_database())) as database_size, pg_database_size(current_database()) as database_bytes"), query('select count(*)::int as count from project_manga'), query('select count(*)::int as count from project_chapters'), query('select count(*)::int as count, max(viewed_at) as last_view from project_view_analytics')]); const backup=latestBackup(); res.json({ database: size.rows[0], counts: { mangas: mangas.rows[0].count, chapters: chapters.rows[0].count, views: views.rows[0].count }, lastView: views.rows[0].last_view, backup: { configured: true, note: backup?'Backup aktif':'Belum ada backup', latest:backup?{name:backup.name,size:backup.size,createdAt:backup.mtime.toISOString()}:null, driveConfigured:Boolean(process.env.PROJECT_BACKUP_RCLONE_REMOTE) } }); });
app.get('/admin/backups/latest', (_req,res)=>{const backup=latestBackup();if(!backup)return res.status(404).json({error:'Backup belum tersedia'});res.download(backup.path,backup.name);});
app.get('/admin/stats', async (_req, res) => {
  const [result, content, chapterTotals] = await Promise.all([
    query("with raw as (select manga_slug, viewed_at::date viewed_on, count(distinct coalesce(viewer_hash,id::text))::bigint unique_views from project_view_analytics where viewed_at >= current_date - interval '6 days' group by manga_slug, viewed_at::date), daily as (select d.manga_slug, d.viewed_on, d.unique_views from project_view_daily d where d.viewed_on >= current_date - 6 and not exists (select 1 from raw r where r.manga_slug=d.manga_slug and r.viewed_on=d.viewed_on)) select manga_slug, viewed_on::text, unique_views from daily union all select manga_slug, viewed_on::text, unique_views from raw"),
    query("select count(*) filter(where deleted_at is null)::int total, count(*) filter(where is_published and deleted_at is null)::int published, count(*) filter(where not is_published and deleted_at is null)::int drafts, count(*) filter(where deleted_at is not null)::int trash, coalesce(sum(view_count) filter(where deleted_at is null),0)::bigint views from project_manga"),
    query("select manga_slug, chapter_number::text, view_count from project_chapters where view_count > 0"),
  ]);
  const bySlug: Record<string,number>={}; let readers7d=0,readersToday=0; const today=new Date().toISOString().slice(0,10);
  for(const row of result.rows){const n=Number(row.unique_views)||0;bySlug[row.manga_slug]=(bySlug[row.manga_slug]||0)+n;readers7d+=n;if(row.viewed_on===today)readersToday+=n;}
  const byChapter: Record<string,Record<string,number>>={};
  for(const row of chapterTotals.rows){if(!byChapter[row.manga_slug])byChapter[row.manga_slug]={};byChapter[row.manga_slug][row.chapter_number]=Number(row.view_count)||0;}
  res.json({readersToday,readers7d,bySlug,byChapter,content:content.rows[0]});
});
app.get('/admin/projects', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || 'all');
  const sort = String(req.query.sort || 'updated_desc');
  const conditions = ["($1 = '' or title ilike '%' || $1 || '%' or slug ilike '%' || $1 || '%' or coalesce(author, '') ilike '%' || $1 || '%')"];
  const values: unknown[] = [search];
  if (status === 'trash') conditions.push('deleted_at is not null');
  else conditions.push('deleted_at is null');
  if (status === 'published' || status === 'draft') {
    values.push(status === 'published');
    conditions.push(`is_published = $${values.length}`);
  } else if (status !== 'all' && status !== 'trash') {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  const orderBy: Record<string, string> = {
    updated_desc: 'updated_at desc', updated_asc: 'updated_at asc',
    title_asc: 'title asc', title_desc: 'title desc',
    views_desc: 'view_count desc', created_desc: 'created_at desc',
  };
  const where = conditions.join(' and ');
  const [rows, count] = await Promise.all([
    query(`select id,slug,title,cover_url,description,type,status,author,genres,is_published,is_spotlight,view_count,deleted_at,created_at,updated_at from project_manga where ${where} order by ${orderBy[sort] || orderBy.updated_desc} offset $${values.length + 1} limit $${values.length + 2}`, [...values, (page - 1) * limit, limit]),
    query(`select count(*)::int as total from project_manga where ${where}`, values),
  ]);
  const total = count.rows[0]?.total || 0;
  res.json({ data: rows.rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});
app.get('/admin/projects/:id', async (req,res)=>{const result=await query('select * from project_manga where id=$1 limit 1',[req.params.id]);if(!result.rows[0])return res.status(404).json({error:'Project not found'});res.json({data:result.rows[0]});});
app.post('/admin/projects', async (req, res) => { const b = req.body || {}; if (!b.slug || !b.title) return res.status(400).json({ error: 'Slug and title are required' }); const result = await query('insert into project_manga(slug,title,cover_url,description,author,status,type,genres,is_published,is_spotlight) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *', [b.slug,b.title,b.cover_url||null,b.description||null,b.author||null,b.status||null,b.type||null,JSON.stringify(b.genres||[]),Boolean(b.is_published),Boolean(b.is_spotlight)]); await logActivity('create','manga',result.rows[0].id,result.rows[0].slug,{title:result.rows[0].title}); res.status(201).json({ data: result.rows[0] }); });
app.patch('/admin/projects/:id', async (req, res) => { const b = req.body || {}; const fields = ['slug','title','cover_url','description','author','status','type','genres','is_published','is_spotlight'].filter((k) => b[k] !== undefined); if (!fields.length) return res.status(400).json({ error: 'No changes' }); const values = fields.map((k) => k==='genres'?JSON.stringify(b[k]):b[k]); const set = fields.map((k, i) => `${k} = $${i + 1}`).join(', '); values.push(req.params.id); const result = await query(`update project_manga set ${set}, updated_at = now() where id = $${values.length} returning *`, values); if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' }); res.json({ data: result.rows[0] }); });
app.post('/admin/projects/:id/restore', async (req,res)=>{const result=await query('update project_manga set deleted_at=null,updated_at=now() where id=$1 returning id,slug,title',[req.params.id]);if(!result.rows[0])return res.status(404).json({error:'Project not found'});await logActivity('restore','manga',result.rows[0].id,result.rows[0].slug,{title:result.rows[0].title});res.json({data:result.rows[0]});});
app.delete('/admin/projects/:id', async (req, res) => { const result=await query('update project_manga set deleted_at=now(),is_published=false,is_spotlight=false,updated_at=now() where id=$1 and deleted_at is null returning id,slug,title',[req.params.id]); if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' }); await logActivity('trash','manga',result.rows[0].id,result.rows[0].slug,{title:result.rows[0].title}); res.json({ success: true, softDeleted:true }); });
app.get('/admin/activity',async(req,res)=>{const limit=Math.min(100,Math.max(1,Number(req.query.limit||30)));const result=await query('select id,action,entity_type,entity_id,manga_slug,detail,created_at from project_activity_log order by created_at desc limit $1',[limit]);res.json({data:result.rows});});
app.get('/admin/chapters', async (req, res) => {
  const slug = String(req.query.manga_slug || '');
  if (!slug) return res.status(400).json({ error: 'manga_slug is required' });
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || 'all');
  const published = status === 'published' ? true : status === 'draft' ? false : null;
  const lockCondition = status === 'premium' ? ' and is_published=true and premium_lock_until>now()' : '';
  const [rows, count] = await Promise.all([
    query("select id,manga_slug,chapter_number,title,image_urls,is_published,uploaded_at,created_at,updated_at,view_count,premium_lock_started_at,premium_lock_until from project_chapters where manga_slug=$1 and ($2='' or chapter_number::text ilike '%' || $2 || '%' or coalesce(title,'') ilike '%' || $2 || '%') and ($3::boolean is null or is_published=$3) " + lockCondition + " order by chapter_number desc offset $4 limit $5", [slug, search, published, (page - 1) * limit, limit]),
    query("select count(*)::int as total from project_chapters where manga_slug=$1 and ($2='' or chapter_number::text ilike '%' || $2 || '%' or coalesce(title,'') ilike '%' || $2 || '%') and ($3::boolean is null or is_published=$3)" + lockCondition, [slug, search, published]),
  ]);
  const total = count.rows[0]?.total || 0;
  res.json({ data: rows.rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});
app.get('/admin/chapters/:id', async(req,res)=>{const result=await query('select * from project_chapters where id=$1 limit 1',[req.params.id]);if(!result.rows[0])return res.status(404).json({error:'Chapter not found'});res.json({data:result.rows[0]});});
app.post('/admin/chapters', async (req, res) => {
  const b = req.body || {};
  if (!b.manga_slug || b.chapter_number === undefined || b.chapter_number === null) return res.status(400).json({ error: 'Manga dan nomor chapter wajib diisi' });
  const duplicate = await query('select id from project_chapters where manga_slug=$1 and chapter_number=$2 limit 1', [b.manga_slug,b.chapter_number]);
  if (duplicate.rows[0]) return res.status(409).json({ error: `Chapter ${b.chapter_number} sudah ada` });
  if (b.is_published && (!Array.isArray(b.image_urls) || b.image_urls.length === 0)) return res.status(400).json({ error: 'Chapter tanpa gambar tidak dapat dipublikasikan' });
  const result = await query("insert into project_chapters(manga_slug,chapter_number,title,image_urls,is_published) values($1,$2,$3,$4,$5) returning *", [b.manga_slug,b.chapter_number,b.title||null,JSON.stringify(b.image_urls||[]),Boolean(b.is_published)]);
  await query('update project_manga set updated_at=now() where slug=$1',[b.manga_slug]); res.status(201).json({ data: result.rows[0] });
});
app.patch('/admin/chapters/:id', async (req, res) => {
  const b = req.body || {};
  if (b.is_published === true && Array.isArray(b.image_urls) && b.image_urls.length === 0) {
    return res.status(400).json({ error: 'Chapter tanpa gambar tidak dapat dipublikasikan' });
  }
  const result = await query(
    "update project_chapters set manga_slug=coalesce($1,manga_slug), chapter_number=coalesce($2,chapter_number), title=coalesce($3,title), image_urls=coalesce($4,image_urls), uploaded_at=case when not is_published and coalesce($5::boolean,false) then now() else uploaded_at end, is_published=coalesce($5,is_published), updated_at=now() where id=$6 returning *",
    [b.manga_slug,b.chapter_number,b.title,b.image_urls===undefined?null:JSON.stringify(b.image_urls),b.is_published,req.params.id],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Chapter not found' });
  if (result.rows[0].is_published && (!Array.isArray(result.rows[0].image_urls) || result.rows[0].image_urls.length === 0)) {
    await query('update project_chapters set is_published=false where id=$1',[req.params.id]);
    return res.status(400).json({ error: 'Chapter tanpa gambar tidak dapat dipublikasikan' });
  }
  await query('update project_manga set updated_at=now() where slug=$1',[result.rows[0].manga_slug]);
  res.json({ data: result.rows[0] });
});
app.delete('/admin/chapters/:id', async (req, res) => { const result = await query('delete from project_chapters where id=$1 returning id', [req.params.id]); if (!result.rows[0]) return res.status(404).json({ error: 'Chapter not found' }); res.json({ success: true }); });
app.post('/admin/discord-events', async(req,res)=>{const b=req.body||{};const result=await query('insert into project_discord_events(event_type,manga_slug,payload) values($1,$2,$3) returning id,event_type,manga_slug,payload,created_at',[b.event_type,b.manga_slug||null,JSON.stringify(b.payload||{})]);res.status(201).json({data:result.rows[0]});});
app.get('/admin/discord-events', async(req,res)=>{const after=Math.max(0,Number(req.query.after||0));const limit=Math.min(50,Math.max(1,Number(req.query.limit||25)));const result=await query('select id,event_type,manga_slug,payload,created_at from project_discord_events where id>$1 order by id asc limit $2',[after,limit]);res.json({data:result.rows});});

app.get('/internal/chapter-access/:slug/:chapter', auth, async (req, res) => {
  const result = await query(
    'select c.premium_lock_started_at,c.premium_lock_until from project_chapters c join project_manga m on m.slug=c.manga_slug where c.manga_slug=$1 and c.chapter_number=$2 and c.is_published=true and m.is_published=true and m.deleted_at is null',
    [req.params.slug, req.params.chapter],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Chapter tidak tersedia' });
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ data: result.rows[0] });
});
app.post('/admin/chapter-lock', async (req, res) => {
  try {
    const data = await changeChapterLocks(pool, req.body);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ data });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    res.status(status).json({ error: status === 500 ? 'Gagal menyimpan lock chapter' : (error as Error).message });
  }
});

app.listen(port, '127.0.0.1', () => console.log(`ryukomik-project-db listening on ${port}`));

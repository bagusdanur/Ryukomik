const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {EventEmitter} = require('node:events');
const {Readable} = require('node:stream');

function loader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const source = fs.readFileSync(filename,'utf8');
    const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const module = {exports:{}};
    cache.set(filename,module.exports);
    const localRequire = name => {
      if (overrides[name]) return overrides[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(__dirname,'src',name.slice(2)) : path.resolve(path.dirname(filename),name);
        return load(base.endsWith('.ts') ? base : base+'.ts');
      }
      return require(name);
    };
    vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,URL,Buffer,process,console,setTimeout,clearTimeout},{filename});
    return module.exports;
  }
  return name => load(path.join(__dirname,'src',name));
}

test('supported active hosts and legacy families use one HTTPS policy', () => {
  const policy = loader()('lib/imageProxyPolicy.ts');
  for (const host of ['sektedoujin.cc','cdn.uqni.net','cdnasu.xyz','cdnkomikindo.xyz','wibulep.xyz','cdnime.xyz','cdn.doujindesu.dev','cdnfgo.xyz','cdn.komikindo.info','pic.desu.xxx','a.desu.photos']) {
    assert(policy.parseProxyImageUrl(`https://${host}/page.jpg`),host);
  }
  for (const value of ['http://sektedoujin.cc/a','https://sektedoujin.cc:444/a','https://user:pass@sektedoujin.cc/a','https://sektedoujin.cc.evil.test/a','https://evilsektedoujin.cc/a','https://127.0.0.1/a','https://example.com/a','broken']) assert.equal(policy.parseProxyImageUrl(value),null,value);
});

test('reader and thumbnails skip unsupported proxy hosts', () => {
  const api = loader()('lib/imageProxy.ts');
  for (const url of ['https://yuucdn.org/a.jpg','https://cdnsusu.my.id/a.jpg','https://example.com/a.jpg']) {
    assert.deepEqual(Array.from(api.getChapterImageCandidates('sekte',url)),[url]);
    assert.equal(api.getProxiedThumbnailUrl(url,'sekte'),url);
  }
  const url = 'https://cdn.uqni.net/a.jpg';
  assert.equal(api.getChapterImageCandidates('sekte',url)[0],'/api/image-proxy?url='+encodeURIComponent(url));
  assert.equal(api.getProxiedThumbnailUrl(url,'sekte'),'/api/image-proxy?url='+encodeURIComponent(url));
});

test('backend double-proxy exception remains intact', () => {
  const api = loader()('lib/imageProxy.ts');
  const url = 'https://api.ryukomik.web.id/doujindesu/image?url=https%3A%2F%2Fpic.desu.xxx%2Fa.jpg';
  assert.deepEqual(Array.from(api.getChapterImageCandidates('doujindesu',url)),[url]);
  assert.equal(api.getProxiedThumbnailUrl(url,'doujindesu'),url);
});

test('known legacy HTTP images upgrade to HTTPS without opening other hosts', () => {
  const load=loader();
  const policy=load('lib/imageProxyPolicy.ts');
  const api=load('lib/imageProxy.ts');
  assert.equal(policy.resolveProxyImageUrl('http://cdnasu.xyz/a.jpg').href,'https://cdnasu.xyz/a.jpg');
  assert.equal(policy.resolveProxyImageUrl('http://127.0.0.1/a.jpg'),null);
  assert.equal(policy.resolveProxyImageUrl('http://cdnasu.xyz:8888/a.jpg'),null);
  assert.equal(api.getOriginalImageUrl('http://cdnkomikindo.xyz/a.jpg'),'https://cdnkomikindo.xyz/a.jpg');
  assert.equal(api.getChapterImageCandidates('sekte','http://cdnasu.xyz/a.jpg')[0],'/api/image-proxy?url='+encodeURIComponent('https://cdnasu.xyz/a.jpg'));
});

function mockedFetch(responses, address = '104.21.1.2') {
  const calls=[];
  const load=loader({
    'node:dns/promises':{lookup:async()=>[{address,family:4}]},
    'node:https':{request:(options,callback)=>{
      calls.push(options);
      const req=new EventEmitter();
      let res;
      req.destroy=error=>{if(res) res.destroy();if(error) req.emit('error',error);req.emit('close');return req;};
      req.end=()=>process.nextTick(()=>{
        const fixture=responses[calls.length-1];
        res=Readable.from([fixture.body || Buffer.alloc(2048)]);
        res.statusCode=fixture.status || 200;
        res.headers=fixture.headers || {'content-type':'image/jpeg'};
        res.on('close',()=>req.emit('close'));
        callback(res);
      });
      return req;
    }},
  });
  return {api:load('lib/imageProxyFetch.ts'),calls};
}

test('private, loopback, mapped IPv4 and documentation addresses are rejected', async () => {
  const {api,calls}=mockedFetch([], '127.0.0.1');
  for(const ip of ['127.0.0.1','10.1.2.3','172.16.1.2','192.168.1.2','169.254.169.254','100.64.1.1','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1']) assert.equal(api.isPublicImageAddress(ip),false,ip);
  assert.equal(api.isPublicImageAddress('2606:4700::1111'),true);
  await assert.rejects(api.fetchProxyImage(new URL('https://sektedoujin.cc/a.jpg')),/not public/);
  assert.equal(calls.length,0);
});

test('redirects are revalidated before making another request', async () => {
  const {api,calls}=mockedFetch([{status:302,headers:{location:'https://127.0.0.1/private'}}]);
  await assert.rejects(api.fetchProxyImage(new URL('https://sektedoujin.cc/a.jpg')),/not allowed/);
  assert.equal(calls.length,1);
});

test('allowed redirect pins public IP, preserves TLS hostname and uses correct referer', async () => {
  const {api,calls}=mockedFetch([{status:302,headers:{location:'https://cdn.uqni.net/a.jpg'}},{}]);
  const response=await api.fetchProxyImage(new URL('https://sektedoujin.cc/a.jpg'));
  assert.equal(response.body.length,2048);
  assert.equal(calls.length,2);
  assert.equal(calls[1].hostname,'104.21.1.2');
  assert.equal(calls[1].servername,'cdn.uqni.net');
  assert.equal(calls[1].headers.Host,'cdn.uqni.net');
  assert.equal(calls[1].headers.Referer,'https://sektedoujin.cc/');
});

test('non-image and oversized origin responses fail instead of being cached', async () => {
  for(const fixture of [{headers:{'content-type':'text/html'}},{headers:{'content-type':'image/jpeg','content-length':String(13*1024*1024)}}]) {
    const {api}=mockedFetch([fixture]);
    await assert.rejects(api.fetchProxyImage(new URL('https://sektedoujin.cc/a.jpg')),/not an image|too large/);
  }
});

test('route distinguishes invalid hosts, upstream failures and valid raster responses', async () => {
  const {ImageProxyBlockedError}=loader()('lib/imageProxyFetch.ts');
  const {NextRequest}=require('next/server');
  let status=200;
  const load=loader({'@/lib/imageProxyFetch':{ImageProxyBlockedError,fetchProxyImage:async()=>({status,headers:{'content-type':'image/jpeg'},body:Buffer.alloc(2048)})}});
  const route=load('app/api/image-proxy/route.ts');
  assert.equal((await route.GET(new NextRequest('http://localhost/api/image-proxy'))).status,400);
  assert.equal((await route.GET(new NextRequest('http://localhost/api/image-proxy?url=https://example.com/a'))).status,403);
  const request=new NextRequest('http://localhost/api/image-proxy?url=https://sektedoujin.cc/a.jpg');
  const response=await route.GET(request);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'image/jpeg');
  assert.equal((await response.arrayBuffer()).byteLength,2048);
  status=404;
  const failed=await route.GET(request);
  assert.equal(failed.status,404);
  assert.equal(failed.headers.get('cache-control'),'no-store');
});

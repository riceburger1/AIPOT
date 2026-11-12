// v24 network-first: latest scripts used online, cached fallback offline.
const CACHE='yeonje-ai-deq-v25-notebook';
const ASSETS=['./','./index.html','./app.js','./prompt-quiz.js','./mock-exam.js','./mock-bank.json','./deq-notebook.js','./deq-term-quiz.js','./deq-notebook-bank.json','./style.css','./content.json','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(async c=>{for(const a of ASSETS){try{await c.add(a)}catch(err){console.warn('캐시 실패',a)}}}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request,{cache:'no-store'});if(r.ok)await c.put(e.request,r.clone());return r}catch(err){return (await c.match(e.request))||(await caches.match(e.request))||Response.error()}})())});

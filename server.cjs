const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 8876);
const notesPath = path.join(root, '.local', 'notes.json');
function json(res, code, value) {
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(value));
}
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.md':'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (name === '/api/notes') {
    if (req.method === 'GET') {
      fs.readFile(notesPath, 'utf8', (error, raw) => {
        if (error?.code === 'ENOENT') return json(res, 200, {text:'',updatedAt:''});
        if (error) return json(res, 500, {error:'Unable to read notes'});
        try { json(res, 200, JSON.parse(raw)); } catch { json(res, 500, {error:'Invalid notes file'}); }
      });
      return;
    }
    if (req.method !== 'PUT') return json(res, 405, {error:'Unsupported method'});
    if (!String(req.headers['content-type']).startsWith('application/json')) return json(res, 415, {error:'JSON required'});
    const chunks = [];let bytes = 0, tooLarge = false;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 100000) {tooLarge = true;return;}
      chunks.push(chunk);
    });
    req.on('end', async () => {
      if (tooLarge) return json(res, 413, {error:'Notes too long'});
      let data;
      try {data = JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {return json(res, 400, {error:'Invalid JSON'});}
      if (typeof data?.text !== 'string' || data.text.length > 20000) return json(res, 400, {error:'Text required, max 20000 characters'});
      const note = {text:data.text,updatedAt:new Date().toISOString()};
      const tempPath = notesPath + '.' + require('node:crypto').randomUUID() + '.tmp';
      try {
        await fs.promises.mkdir(path.dirname(notesPath), {recursive:true});
        await fs.promises.writeFile(tempPath, JSON.stringify(note,null,2), 'utf8');
        await fs.promises.rename(tempPath, notesPath);
        json(res, 200, note);
      } catch {await fs.promises.unlink(tempPath).catch(() => {});json(res, 500, {error:'Unable to save notes'});}
    });
    return;
  }
  if (name.split('/').some(part => part.startsWith('.'))) {res.writeHead(403).end();return;}
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}`));

// Backend server for Fit Force.
//
// Every device (each phone, each laptop) used to store its own separate
// copy of the app's data, so a soldier registering on a phone was invisible
// to the Adjutant approving accounts on a laptop. This server holds the one
// shared copy of that data — now in a real SQLite database (server/db.js)
// with a table per entity — that every device reads and writes over the
// same LAN the Expo dev server already uses. It also serves uploaded report
// attachments and generates PT plan PDFs on demand.

const http = require('http');
const fs = require('fs');
const path = require('path');

const db = require('./db');
const { renderPlanPdf } = require('./pdf');
const { sendPush } = require('./push');

const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB, comfortably covers a scanned PDF/DOC

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data === undefined ? '' : JSON.stringify(data));
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (maxBytes && bytes > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Each entry maps a table's REST surface to its db.js accessor. Kept as
// data rather than repeated if-chains so every entity gets the same
// GET-list / POST-insert / PATCH-update(if supported) / DELETE behavior
// from one small dispatch table below.
const COLLECTIONS = {
  users: db.Users,
  soldiers: db.Soldiers,
  'pt-plans': db.Plans,
  'ipft-results': db.Results,
  notifications: db.Notifications,
  messages: db.Messages,
  reports: db.Reports,
};

async function handleApi(req, res, url) {
  const parts = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  const [resource, id, action] = parts;

  // ── IPFT schedule: singleton, not a list ──
  if (resource === 'ipft-schedule') {
    if (req.method === 'GET') return sendJson(res, 200, db.Schedule.get());
    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      db.Schedule.save(body);
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const collection = COLLECTIONS[resource];
  if (!collection) return sendJson(res, 404, { error: 'Not found' });

  // Mark-as-read actions: PATCH /api/<resource>/:id/read
  if (action === 'read' && req.method === 'PATCH') {
    if (!collection.markRead) return sendJson(res, 404, { error: 'Not found' });
    collection.markRead(id);
    return sendJson(res, 200, { ok: true });
  }
  // PATCH /api/notifications/read-all
  if (resource === 'notifications' && id === 'read-all' && req.method === 'PATCH') {
    db.Notifications.markAllRead();
    return sendJson(res, 200, { ok: true });
  }

  if (!id) {
    if (req.method === 'GET') return sendJson(res, 200, collection.all());
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      try {
        collection.insert(body);
        if (resource === 'messages' || resource === 'reports') {
          const recipient = db.Users.all().find(u => u.id === body.toId);
          if (recipient?.pushToken) {
            const title = resource === 'messages' ? `Message: ${body.subject}` : `Report: ${body.title}`;
            const preview = String(body.content ?? '').slice(0, 120);
            sendPush(recipient.pushToken, title, preview);
          }
        }
        return sendJson(res, 200, { ok: true });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (req.method === 'PATCH') {
    if (!collection.update) return sendJson(res, 404, { error: 'Not found' });
    const body = await readJsonBody(req);
    collection.update(id, body ?? {});
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'DELETE') {
    if (!collection.delete) return sendJson(res, 404, { error: 'Not found' });
    collection.delete(id);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url);
    } catch (e) {
      console.error(e);
      sendJson(res, 500, { error: 'Internal error' });
    }
    return;
  }

  // ── Generate a PT plan PDF: client sends the plan JSON, gets back a URL ──
  if (req.method === 'POST' && url.pathname === '/generate-plan-pdf') {
    try {
      const plan = await readJsonBody(req, 2 * 1024 * 1024);
      if (!plan || !plan.title) return sendJson(res, 400, { error: 'A plan object is required' });
      const buffer = await renderPlanPdf(plan);
      const safeName = `${String(plan.title).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 60)}.pdf`;
      const storedName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);
      return sendJson(res, 200, { url: `/files/${storedName}`, name: safeName, mimeType: 'application/pdf', size: buffer.length });
    } catch (e) {
      return sendJson(res, 500, { error: 'Could not generate PDF' });
    }
  }

  // ── File upload: client sends { name, mimeType, base64 } as JSON ──
  if (req.method === 'POST' && url.pathname === '/upload') {
    try {
      const payload = await readJsonBody(req, MAX_UPLOAD_BYTES * 1.4); // base64 inflates ~33%
      if (!payload || !payload.base64 || !payload.name) return sendJson(res, 400, { error: 'name and base64 are required' });
      const buffer = Buffer.from(payload.base64, 'base64');
      if (buffer.length > MAX_UPLOAD_BYTES) return sendJson(res, 413, { error: 'File too large (max 15MB)' });
      const safeName = String(payload.name).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-100);
      const storedName = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);
      return sendJson(res, 200, {
        url: `/files/${storedName}`,
        name: safeName,
        mimeType: payload.mimeType || 'application/octet-stream',
        size: buffer.length,
      });
    } catch (e) {
      return sendJson(res, 400, { error: 'Upload failed' });
    }
  }

  // ── File download ──
  const fileMatch = url.pathname.match(/^\/files\/([^/]+)$/);
  if (req.method === 'GET' && fileMatch) {
    const storedName = decodeURIComponent(fileMatch[1]);
    const filePath = path.join(UPLOAD_DIR, storedName);
    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: 'Not found' });
    }
    const displayName = storedName.replace(/^[a-z0-9]+-[a-z0-9]+-/i, '');
    const forceDownload = url.searchParams.get('download') === '1';
    const contentType = displayName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${displayName}"`,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fit Force backend listening on http://0.0.0.0:${PORT}`);
  console.log(`Database: ${path.join(__dirname, 'fitforce.db')}`);
  console.log(`Uploads dir: ${UPLOAD_DIR}`);
});

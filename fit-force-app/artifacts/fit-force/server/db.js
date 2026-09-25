// Real relational database for Fit Force, using Node's built-in SQLite
// module (node:sqlite, stable since Node 22.5) — no native module install,
// no separate DB server process, just a single file on disk.
//
// This replaces the earlier version of this backend, which stored every
// collection as one big JSON blob under a key/value API. Here each entity
// gets a real table with real columns, so the data can actually be queried,
// constrained, and inspected with normal SQL — not just read back whole.
//
// Two fields per row (PTPlan.days, IPFTResult.items) stay as JSON text
// columns rather than being split into their own child tables. Both are
// small, always read/written as a whole unit with their parent, and never
// queried independently — normalizing them into 3-4 extra join tables would
// add real complexity for a shape that's never accessed as anything but
// "the whole nested list", so a JSON column is the pragmatic choice here
// (SQLite has native json_* functions if that ever needs to change).

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'fitforce.db');
const LEGACY_KV_FILE = path.join(__dirname, 'data-store.json');
// A snapshot of the real (non-placeholder) database, bundled with the code
// so a fresh deploy target (e.g. a brand new Railway volume) starts from
// the actual accumulated data instead of the static placeholder seed set.
const REAL_DATA_SEED_FILE = path.join(__dirname, 'fitforce.seed.db');

const {
  SEED_USERS, SEED_SOLDIERS, SEED_PT_PLANS, SEED_IPFT_RESULTS,
  SEED_IPFT_SCHEDULE, SEED_NOTIFICATIONS, SEED_REPORTS,
} = require('./seed-data');

if (!fs.existsSync(DB_FILE) && fs.existsSync(REAL_DATA_SEED_FILE)) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.copyFileSync(REAL_DATA_SEED_FILE, DB_FILE);
  console.log(`Initialized database from bundled real-data snapshot: ${REAL_DATA_SEED_FILE}`);
}

const isNewDb = !fs.existsSync(DB_FILE);
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    rank TEXT,
    ba TEXT,
    company TEXT,
    phone TEXT,
    address TEXT,
    bloodGroup TEXT,
    medicalCategory TEXT,
    height REAL,
    weight REAL,
    age INTEGER,
    serviceNumber TEXT,
    isApproved INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS soldiers (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    serviceNumber TEXT,
    name TEXT,
    rank TEXT,
    company TEXT,
    email TEXT,
    bloodGroup TEXT,
    height REAL,
    weight REAL,
    age INTEGER,
    medicalCategory TEXT,
    phone TEXT,
    address TEXT,
    isApproved INTEGER NOT NULL DEFAULT 0,
    isOverweight INTEGER NOT NULL DEFAULT 0,
    ptStatus TEXT
  );

  CREATE TABLE IF NOT EXISTS pt_plans (
    id TEXT PRIMARY KEY,
    title TEXT,
    type TEXT,
    description TEXT,
    createdBy TEXT,
    createdByName TEXT,
    weekNumber INTEGER,
    daysJson TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS ipft_results (
    id TEXT PRIMARY KEY,
    soldierId TEXT,
    soldierName TEXT,
    soldierRank TEXT,
    serviceNumber TEXT,
    company TEXT,
    date TEXT,
    itemsJson TEXT,
    overallStatus TEXT,
    recordedBy TEXT,
    recordedByName TEXT,
    bmi REAL,
    biannual TEXT,
    selfReported INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ipft_schedule (
    id TEXT PRIMARY KEY,
    proposedDate TEXT,
    proposedBy TEXT,
    proposedByName TEXT,
    status TEXT,
    approvedBy TEXT,
    rejectionNote TEXT,
    alternateDate TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    targetRole TEXT,
    targetCompany TEXT,
    targetUserId TEXT,
    title TEXT,
    body TEXT,
    type TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    fromId TEXT, fromName TEXT, fromRole TEXT,
    toId TEXT, toRole TEXT,
    subject TEXT, content TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    fromId TEXT, fromName TEXT, fromRole TEXT,
    toId TEXT, toRole TEXT,
    title TEXT, content TEXT,
    attachmentLabel TEXT, attachmentUrl TEXT, attachmentMimeType TEXT,
    company TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT
  );
`);

// Additive migration: `pushToken` was added after the users table already
// existed on disk for anyone who ran the app before this feature, so
// CREATE TABLE IF NOT EXISTS above won't add it — patch it in directly.
const usersColumns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!usersColumns.includes('pushToken')) {
  db.exec('ALTER TABLE users ADD COLUMN pushToken TEXT');
}

// ---- row <-> app-object mapping (SQLite has no boolean type) ----
const toUser = r => ({ ...r, isApproved: !!r.isApproved, company: r.company ?? undefined, phone: r.phone ?? undefined, bloodGroup: r.bloodGroup ?? undefined, medicalCategory: r.medicalCategory ?? undefined, height: r.height ?? undefined, weight: r.weight ?? undefined, age: r.age ?? undefined, address: r.address ?? undefined, serviceNumber: r.serviceNumber ?? undefined, pushToken: r.pushToken ?? undefined });
const toSoldier = r => ({ ...r, isApproved: !!r.isApproved, isOverweight: !!r.isOverweight, address: r.address ?? undefined });
const toPlan = r => ({ ...r, days: JSON.parse(r.daysJson || '[]'), daysJson: undefined });
const toResult = r => ({ ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined, selfReported: !!r.selfReported, biannual: r.biannual ?? undefined, bmi: r.bmi ?? undefined });
const toNotif = r => ({ ...r, read: !!r.read, targetRole: r.targetRole ?? undefined, targetCompany: r.targetCompany ?? undefined, targetUserId: r.targetUserId ?? undefined });
const toMsg = r => ({ ...r, read: !!r.read });
const toReport = r => ({ ...r, read: !!r.read, attachmentLabel: r.attachmentLabel ?? undefined, attachmentUrl: r.attachmentUrl ?? undefined, attachmentMimeType: r.attachmentMimeType ?? undefined, company: r.company ?? undefined });

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count > 0) return;

  // If the previous JSON-blob backend already has real data on disk (from
  // testing this session), migrate it in instead of overwriting with the
  // static seed set.
  let seed = {
    users: SEED_USERS, soldiers: SEED_SOLDIERS, pt_plans: SEED_PT_PLANS,
    ipft_results: SEED_IPFT_RESULTS, ipft_schedule: SEED_IPFT_SCHEDULE,
    notifications: SEED_NOTIFICATIONS, messages: [], reports: SEED_REPORTS,
  };
  if (fs.existsSync(LEGACY_KV_FILE)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_KV_FILE, 'utf8'));
      seed = {
        users: legacy['fitforce:users'] ?? seed.users,
        soldiers: legacy['fitforce:soldiers'] ?? seed.soldiers,
        pt_plans: legacy['fitforce:pt_plans'] ?? seed.pt_plans,
        ipft_results: legacy['fitforce:ipft_results'] ?? seed.ipft_results,
        ipft_schedule: legacy['fitforce:ipft_schedule'] ?? seed.ipft_schedule,
        notifications: legacy['fitforce:notifications'] ?? seed.notifications,
        messages: legacy['fitforce:messages'] ?? seed.messages,
        reports: legacy['fitforce:reports'] ?? seed.reports,
      };
      console.log(`Migrating existing data from ${LEGACY_KV_FILE} into SQLite...`);
    } catch (e) {
      console.error('Could not read legacy data-store.json, using static seed data instead.', e);
    }
  }

  const insertUser = db.prepare(`INSERT INTO users (id,email,password,role,name,rank,ba,company,phone,address,bloodGroup,medicalCategory,height,weight,age,serviceNumber,isApproved) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const u of seed.users) {
    insertUser.run(u.id, u.email, u.password, u.role, u.name, u.rank ?? null, u.ba ?? null, u.company ?? null, u.phone ?? null, u.address ?? null, u.bloodGroup ?? null, u.medicalCategory ?? null, u.height ?? null, u.weight ?? null, u.age ?? null, u.serviceNumber ?? null, u.isApproved === false ? 0 : 1);
  }

  const insertSoldier = db.prepare(`INSERT INTO soldiers (id,userId,serviceNumber,name,rank,company,email,bloodGroup,height,weight,age,medicalCategory,phone,address,isApproved,isOverweight,ptStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const s of seed.soldiers) {
    insertSoldier.run(s.id, s.userId, s.serviceNumber, s.name, s.rank, s.company, s.email, s.bloodGroup, s.height, s.weight, s.age, s.medicalCategory, s.phone, s.address ?? null, s.isApproved ? 1 : 0, s.isOverweight ? 1 : 0, s.ptStatus);
  }

  const insertPlan = db.prepare(`INSERT INTO pt_plans (id,title,type,description,createdBy,createdByName,weekNumber,daysJson,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const p of seed.pt_plans) {
    insertPlan.run(p.id, p.title, p.type, p.description, p.createdBy, p.createdByName, p.weekNumber, JSON.stringify(p.days ?? []), p.createdAt);
  }

  const insertResult = db.prepare(`INSERT INTO ipft_results (id,soldierId,soldierName,soldierRank,serviceNumber,company,date,itemsJson,overallStatus,recordedBy,recordedByName,bmi,biannual,selfReported) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const r of seed.ipft_results) {
    insertResult.run(r.id, r.soldierId, r.soldierName, r.soldierRank, r.serviceNumber, r.company, r.date, JSON.stringify(r.items ?? []), r.overallStatus, r.recordedBy, r.recordedByName, r.bmi ?? null, r.biannual ?? null, r.selfReported ? 1 : 0);
  }

  if (seed.ipft_schedule) {
    const s = seed.ipft_schedule;
    db.prepare(`INSERT INTO ipft_schedule (id,proposedDate,proposedBy,proposedByName,status,approvedBy,rejectionNote,alternateDate,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(s.id, s.proposedDate, s.proposedBy, s.proposedByName, s.status, s.approvedBy ?? null, s.rejectionNote ?? null, s.alternateDate ?? null, s.createdAt);
  }

  const insertNotif = db.prepare(`INSERT INTO notifications (id,targetRole,targetCompany,targetUserId,title,body,type,read,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const n of seed.notifications) {
    insertNotif.run(n.id, n.targetRole ?? null, n.targetCompany ?? null, n.targetUserId ?? null, n.title, n.body, n.type, n.read ? 1 : 0, n.createdAt);
  }

  const insertMsg = db.prepare(`INSERT INTO messages (id,fromId,fromName,fromRole,toId,toRole,subject,content,read,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const m of seed.messages) {
    insertMsg.run(m.id, m.fromId, m.fromName, m.fromRole, m.toId, m.toRole, m.subject, m.content, m.read ? 1 : 0, m.createdAt);
  }

  const insertReport = db.prepare(`INSERT INTO reports (id,fromId,fromName,fromRole,toId,toRole,title,content,attachmentLabel,attachmentUrl,attachmentMimeType,company,read,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const r of seed.reports) {
    insertReport.run(r.id, r.fromId, r.fromName, r.fromRole, r.toId, r.toRole, r.title, r.content, r.attachmentLabel ?? null, r.attachmentUrl ?? null, r.attachmentMimeType ?? null, r.company ?? null, r.read ? 1 : 0, r.createdAt);
  }

  console.log(`Seeded database: ${seed.users.length} users, ${seed.soldiers.length} soldiers, ${seed.pt_plans.length} plans, ${seed.ipft_results.length} IPFT results, ${seed.notifications.length} notifications, ${seed.messages.length} messages, ${seed.reports.length} reports.`);
}

seedIfEmpty();

// ── Users ──
const Users = {
  all: () => db.prepare('SELECT * FROM users').all().map(toUser),
  insert: u => db.prepare(`INSERT INTO users (id,email,password,role,name,rank,ba,company,phone,address,bloodGroup,medicalCategory,height,weight,age,serviceNumber,isApproved) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(u.id, u.email, u.password, u.role, u.name, u.rank ?? null, u.ba ?? null, u.company ?? null, u.phone ?? null, u.address ?? null, u.bloodGroup ?? null, u.medicalCategory ?? null, u.height ?? null, u.weight ?? null, u.age ?? null, u.serviceNumber ?? null, u.isApproved === false ? 0 : 1),
  update: (id, updates) => {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;
    const set = fields.map(f => `${f} = ?`).join(', ');
    const vals = fields.map(f => {
      const v = updates[f];
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v ?? null;
    });
    db.prepare(`UPDATE users SET ${set} WHERE id = ?`).run(...vals, id);
  },
  delete: id => db.prepare('DELETE FROM users WHERE id = ?').run(id),
};

// ── Soldiers ──
const Soldiers = {
  all: () => db.prepare('SELECT * FROM soldiers').all().map(toSoldier),
  insert: s => db.prepare(`INSERT INTO soldiers (id,userId,serviceNumber,name,rank,company,email,bloodGroup,height,weight,age,medicalCategory,phone,address,isApproved,isOverweight,ptStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(s.id, s.userId, s.serviceNumber, s.name, s.rank, s.company, s.email, s.bloodGroup, s.height, s.weight, s.age, s.medicalCategory, s.phone, s.address ?? null, s.isApproved ? 1 : 0, s.isOverweight ? 1 : 0, s.ptStatus),
  update: (id, updates) => {
    const fields = Object.keys(updates);
    if (fields.length === 0) return;
    const set = fields.map(f => `${f} = ?`).join(', ');
    const vals = fields.map(f => {
      const v = updates[f];
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v ?? null;
    });
    db.prepare(`UPDATE soldiers SET ${set} WHERE id = ?`).run(...vals, id);
  },
  delete: id => db.prepare('DELETE FROM soldiers WHERE id = ?').run(id),
};

// ── PT Plans ──
const Plans = {
  all: () => db.prepare('SELECT * FROM pt_plans ORDER BY rowid DESC').all().map(toPlan),
  insert: p => db.prepare(`INSERT INTO pt_plans (id,title,type,description,createdBy,createdByName,weekNumber,daysJson,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(p.id, p.title, p.type, p.description, p.createdBy, p.createdByName, p.weekNumber, JSON.stringify(p.days ?? []), p.createdAt),
};

// ── IPFT Results ──
const Results = {
  all: () => db.prepare('SELECT * FROM ipft_results ORDER BY rowid DESC').all().map(toResult),
  insert: r => db.prepare(`INSERT INTO ipft_results (id,soldierId,soldierName,soldierRank,serviceNumber,company,date,itemsJson,overallStatus,recordedBy,recordedByName,bmi,biannual,selfReported) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(r.id, r.soldierId, r.soldierName, r.soldierRank, r.serviceNumber, r.company, r.date, JSON.stringify(r.items ?? []), r.overallStatus, r.recordedBy, r.recordedByName, r.bmi ?? null, r.biannual ?? null, r.selfReported ? 1 : 0),
};

// ── IPFT Schedule (singleton) ──
const Schedule = {
  get: () => {
    const row = db.prepare('SELECT * FROM ipft_schedule ORDER BY rowid DESC LIMIT 1').get();
    return row ?? null;
  },
  save: s => {
    db.exec('DELETE FROM ipft_schedule');
    db.prepare(`INSERT INTO ipft_schedule (id,proposedDate,proposedBy,proposedByName,status,approvedBy,rejectionNote,alternateDate,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(s.id, s.proposedDate, s.proposedBy, s.proposedByName, s.status, s.approvedBy ?? null, s.rejectionNote ?? null, s.alternateDate ?? null, s.createdAt);
  },
};

// ── Notifications ──
const Notifications = {
  all: () => db.prepare('SELECT * FROM notifications ORDER BY rowid DESC').all().map(toNotif),
  insert: n => db.prepare(`INSERT INTO notifications (id,targetRole,targetCompany,targetUserId,title,body,type,read,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(n.id, n.targetRole ?? null, n.targetCompany ?? null, n.targetUserId ?? null, n.title, n.body, n.type, n.read ? 1 : 0, n.createdAt),
  markRead: id => db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id),
  markAllRead: () => db.exec('UPDATE notifications SET read = 1'),
};

// ── Messages ──
const Messages = {
  all: () => db.prepare('SELECT * FROM messages ORDER BY rowid DESC').all().map(toMsg),
  insert: m => db.prepare(`INSERT INTO messages (id,fromId,fromName,fromRole,toId,toRole,subject,content,read,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(m.id, m.fromId, m.fromName, m.fromRole, m.toId, m.toRole, m.subject, m.content, m.read ? 1 : 0, m.createdAt),
  markRead: id => db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(id),
};

// ── Reports ──
const Reports = {
  all: () => db.prepare('SELECT * FROM reports ORDER BY rowid DESC').all().map(toReport),
  insert: r => db.prepare(`INSERT INTO reports (id,fromId,fromName,fromRole,toId,toRole,title,content,attachmentLabel,attachmentUrl,attachmentMimeType,company,read,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(r.id, r.fromId, r.fromName, r.fromRole, r.toId, r.toRole, r.title, r.content, r.attachmentLabel ?? null, r.attachmentUrl ?? null, r.attachmentMimeType ?? null, r.company ?? null, r.read ? 1 : 0, r.createdAt),
  markRead: id => db.prepare('UPDATE reports SET read = 1 WHERE id = ?').run(id),
};

module.exports = { db, isNewDb, Users, Soldiers, Plans, Results, Schedule, Notifications, Messages, Reports };

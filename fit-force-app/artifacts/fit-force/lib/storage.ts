import { API_BASE } from './api';
import type { User, Soldier, PTPlan, IPFTResult, IPFTSchedule, Notification, Report, Message } from './types';

/**
 * Every function here talks to the shared backend's REST API
 * (server/api-server.js -> server/db.js, a real SQLite database) instead of
 * per-device storage, so every device sees the same users, soldiers,
 * messages, notifications and reports. The database seeds itself on first
 * run, so there is nothing left for the client to initialize.
 */
export async function initStorage(): Promise<void> {}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<void> {
  await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function apiPatch(path: string, body?: unknown): Promise<void> {
  await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function apiDelete(path: string): Promise<void> {
  await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
}

async function apiPut(path: string, body: unknown): Promise<void> {
  await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Users ────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> { return apiGet<User[]>('/api/users'); }

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function addUser(user: User): Promise<void> {
  await apiPost('/api/users', user);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  await apiPatch(`/api/users/${encodeURIComponent(id)}`, updates);
}

export async function deleteUser(id: string): Promise<void> {
  await apiDelete(`/api/users/${encodeURIComponent(id)}`);
}

// ── Soldiers ──────────────────────────────────────────────
export async function getSoldiers(): Promise<Soldier[]> { return apiGet<Soldier[]>('/api/soldiers'); }

export async function getSoldiersByCompany(company: string): Promise<Soldier[]> {
  const soldiers = await getSoldiers();
  return soldiers.filter(s => s.company === company);
}

export async function getSoldierById(id: string): Promise<Soldier | null> {
  const soldiers = await getSoldiers();
  return soldiers.find(s => s.id === id) ?? null;
}

export async function updateSoldier(id: string, updates: Partial<Soldier>): Promise<void> {
  await apiPatch(`/api/soldiers/${encodeURIComponent(id)}`, updates);
}

export async function deleteSoldier(id: string): Promise<void> {
  await apiDelete(`/api/soldiers/${encodeURIComponent(id)}`);
}

export async function addSoldier(soldier: Soldier): Promise<void> {
  await apiPost('/api/soldiers', soldier);
}

// ── PT Plans ──────────────────────────────────────────────
export async function getPTPlans(): Promise<PTPlan[]> { return apiGet<PTPlan[]>('/api/pt-plans'); }

export async function addPTPlan(plan: PTPlan): Promise<void> {
  await apiPost('/api/pt-plans', plan);
}

// ── IPFT Results ──────────────────────────────────────────
export async function getIPFTResults(): Promise<IPFTResult[]> { return apiGet<IPFTResult[]>('/api/ipft-results'); }

export async function getIPFTResultsBySoldier(soldierId: string): Promise<IPFTResult[]> {
  const results = await getIPFTResults();
  return results.filter(r => r.soldierId === soldierId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function addIPFTResult(result: IPFTResult): Promise<void> {
  await apiPost('/api/ipft-results', result);
}

// ── IPFT Schedule ─────────────────────────────────────────
export async function getIPFTSchedule(): Promise<IPFTSchedule | null> {
  return apiGet<IPFTSchedule | null>('/api/ipft-schedule');
}

export async function saveIPFTSchedule(schedule: IPFTSchedule): Promise<void> {
  await apiPut('/api/ipft-schedule', schedule);
}

// ── Notifications ─────────────────────────────────────────
export async function getNotifications(): Promise<Notification[]> { return apiGet<Notification[]>('/api/notifications'); }

export async function addNotification(notif: Notification): Promise<void> {
  await apiPost('/api/notifications', notif);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch(`/api/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch('/api/notifications/read-all');
}

// ── Messages ──────────────────────────────────────────────
export async function getMessages(): Promise<Message[]> { return apiGet<Message[]>('/api/messages'); }

export async function addMessage(msg: Message): Promise<void> {
  await apiPost('/api/messages', msg);
}

export async function markMessageRead(id: string): Promise<void> {
  await apiPatch(`/api/messages/${encodeURIComponent(id)}/read`);
}

// ── Reports ───────────────────────────────────────────────
export async function getReports(): Promise<Report[]> { return apiGet<Report[]>('/api/reports'); }

export async function addReport(report: Report): Promise<void> {
  await apiPost('/api/reports', report);
}

export async function markReportRead(id: string): Promise<void> {
  await apiPatch(`/api/reports/${encodeURIComponent(id)}/read`);
}

// ── Helpers ───────────────────────────────────────────────
export function calcBMI(weight: number, height: number): number {
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

/** Computes age in whole years from a "YYYY-MM-DD" date of birth, as of today. */
export function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

import { NextResponse } from 'next/server';

const GLOBAL_KEY = '__pulsecheck_sessions__';

type SessionMap = Map<string, { createdAt: number }>;

function getSessionMap(): SessionMap {
  const g = globalThis as unknown as Record<string, SessionMap>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map();
  }
  return g[GLOBAL_KEY];
}

export function createSession(): string {
  const token = crypto.randomUUID();
  getSessionMap().set(token, { createdAt: Date.now() });
  return token;
}

export function validateSession(token: string): boolean {
  return getSessionMap().has(token);
}

export function destroySession(token: string): void {
  getSessionMap().delete(token);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  return cookies['admin_session'] || null;
}

export function requireAdmin(
  request: Request,
): { ok: true } | NextResponse {
  const token = getSessionToken(request);
  if (!token || !validateSession(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { ok: true };
}

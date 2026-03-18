import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  return process.env.ADMIN_PASSWORD || 'pulsecheck-fallback-secret';
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function createSession(): string {
  const payload = Buffer.from(
    JSON.stringify({ createdAt: Date.now() }),
  ).toString('base64url');
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function validateSession(token: string): boolean {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;
  const payload = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);

  const expectedSig = sign(payload);

  if (providedSig.length !== expectedSig.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(providedSig, 'hex'),
      Buffer.from(expectedSig, 'hex'),
    );
  } catch {
    return false;
  }
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

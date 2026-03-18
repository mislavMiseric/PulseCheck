import { NextResponse } from 'next/server';
import { getSessionToken, destroySession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const token = getSessionToken(request);
  if (token) destroySession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}

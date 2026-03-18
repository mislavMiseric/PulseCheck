import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  return NextResponse.json({ ok: true });
}

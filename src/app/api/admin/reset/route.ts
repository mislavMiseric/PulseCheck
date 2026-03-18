import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { resetSession } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  resetSession();
  return NextResponse.json({ ok: true });
}

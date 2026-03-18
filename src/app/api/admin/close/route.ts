import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { closeQuestion } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const question = closeQuestion();
  if (!question) {
    return NextResponse.json(
      { error: 'No question is currently open' },
      { status: 400 },
    );
  }

  return NextResponse.json({ question });
}

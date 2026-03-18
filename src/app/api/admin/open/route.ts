import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { openQuestion } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { questionId } = await request.json();

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 },
      );
    }

    const question = openQuestion(questionId);
    return NextResponse.json({ question });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

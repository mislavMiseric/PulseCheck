import { NextResponse } from 'next/server';
import { recordVote } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { questionId, optionIndex, otherText } = await request.json();

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 },
      );
    }

    if (typeof optionIndex !== 'number' || !Number.isInteger(optionIndex)) {
      return NextResponse.json(
        { error: 'optionIndex must be an integer' },
        { status: 400 },
      );
    }

    if (otherText !== undefined && typeof otherText !== 'string') {
      return NextResponse.json(
        { error: 'otherText must be a string' },
        { status: 400 },
      );
    }

    recordVote(questionId, optionIndex, otherText);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

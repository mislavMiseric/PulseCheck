import { NextResponse } from 'next/server';
import { recordVote, recordVotes } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { questionId, optionIndex, optionIndices, otherText } = await request.json();

    if (!questionId || typeof questionId !== 'string') {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 },
      );
    }

    if (otherText !== undefined && typeof otherText !== 'string') {
      return NextResponse.json(
        { error: 'otherText must be a string' },
        { status: 400 },
      );
    }

    if (Array.isArray(optionIndices)) {
      if (
        optionIndices.length === 0 ||
        optionIndices.some((i: unknown) => typeof i !== 'number' || !Number.isInteger(i))
      ) {
        return NextResponse.json(
          { error: 'optionIndices must be a non-empty array of integers' },
          { status: 400 },
        );
      }
      await recordVotes(questionId, optionIndices, otherText);
    } else {
      if (typeof optionIndex !== 'number' || !Number.isInteger(optionIndex)) {
        return NextResponse.json(
          { error: 'optionIndex must be an integer' },
          { status: 400 },
        );
      }
      await recordVote(questionId, optionIndex, otherText);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

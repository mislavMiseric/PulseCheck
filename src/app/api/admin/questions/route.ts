import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { addQuestion } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { text, options, allowOther } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Question text is required' },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(options) ||
      options.length < 2 ||
      options.length > 6 ||
      options.some((o: unknown) => typeof o !== 'string' || !(o as string).trim())
    ) {
      return NextResponse.json(
        { error: 'Provide 2-6 non-empty options' },
        { status: 400 },
      );
    }

    const question = addQuestion(
      text.trim(),
      options.map((o: string) => o.trim()),
      !!allowOther,
    );

    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

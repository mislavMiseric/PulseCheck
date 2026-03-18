export interface Question {
  id: string;
  text: string;
  options: string[];
  status: 'draft' | 'open' | 'closed';
  votes: number[];
  allowOther: boolean;
  otherTexts: string[];
  updatedAt: number;
}

export interface SessionState {
  questions: Question[];
  activeQuestionId: string | null;
  lastClosedQuestionId: string | null;
  version: number;
}

/**
 * Merges incoming SSE state with local state instead of replacing it.
 * On Vercel serverless, SSE events can arrive from instances with incomplete
 * in-memory state (cold starts). This merge keeps questions the client already
 * knows about while accepting updated data for shared questions.
 */
export function mergeState(
  prev: SessionState | null,
  incoming: SessionState,
): SessionState {
  if (!prev) return incoming;

  const map = new Map<string, Question>();
  for (const q of prev.questions) map.set(q.id, q);
  for (const q of incoming.questions) {
    const existing = map.get(q.id);
    if (!existing || (q.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      map.set(q.id, q);
    }
  }

  const mergedQuestions = Array.from(map.values());

  const openQuestion = mergedQuestions.find((q) => q.status === 'open');

  const lastClosed = mergedQuestions
    .filter((q) => q.status === 'closed')
    .reduce<Question | null>((latest, q) => {
      if (!latest || (q.updatedAt ?? 0) > (latest.updatedAt ?? 0)) return q;
      return latest;
    }, null);

  return {
    questions: mergedQuestions,
    activeQuestionId: openQuestion?.id ?? null,
    lastClosedQuestionId: lastClosed?.id ?? null,
    version: Math.max(prev.version, incoming.version),
  };
}

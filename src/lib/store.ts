import { broadcast } from './event-bus';

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

const GLOBAL_KEY = '__pulsecheck_store__';

function getStore(): SessionState {
  const g = globalThis as unknown as Record<string, SessionState>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      questions: [],
      activeQuestionId: null,
      lastClosedQuestionId: null,
      version: 0,
    };
  }
  return g[GLOBAL_KEY];
}

function touch() {
  const s = getStore();
  s.version++;
  broadcast('state', getState());
}

export function getState(): SessionState {
  return { ...getStore() };
}

export function addQuestion(text: string, options: string[], allowOther = false): Question {
  const store = getStore();
  const allOptions = allowOther ? [...options, 'Other'] : options;
  const q: Question = {
    id: crypto.randomUUID(),
    text,
    options: allOptions,
    status: 'draft',
    votes: new Array(allOptions.length).fill(0),
    allowOther,
    otherTexts: [],
    updatedAt: Date.now(),
  };
  store.questions.push(q);
  touch();
  return q;
}

export function openQuestion(id: string): Question {
  const store = getStore();
  const q = store.questions.find((q) => q.id === id);
  if (!q) throw new Error('Question not found');

  const now = Date.now();
  for (const other of store.questions) {
    if (other.status === 'open') {
      other.status = 'closed';
      other.updatedAt = now;
    }
  }

  q.status = 'open';
  q.votes = new Array(q.options.length).fill(0);
  q.otherTexts = [];
  q.updatedAt = now;
  store.activeQuestionId = id;
  touch();
  return q;
}

export function closeQuestion(): Question | null {
  const store = getStore();
  if (!store.activeQuestionId) return null;
  const q = store.questions.find((q) => q.id === store.activeQuestionId);
  if (!q) return null;

  q.status = 'closed';
  q.updatedAt = Date.now();
  store.lastClosedQuestionId = store.activeQuestionId;
  store.activeQuestionId = null;
  touch();
  return q;
}

export function recordVote(questionId: string, optionIndex: number, otherText?: string): void {
  const store = getStore();
  const q = store.questions.find((q) => q.id === questionId);
  if (!q) throw new Error('Question not found');
  if (q.status !== 'open') throw new Error('Question is not open');
  if (optionIndex < 0 || optionIndex >= q.options.length) {
    throw new Error('Invalid option index');
  }
  const isOtherIndex = q.allowOther && optionIndex === q.options.length - 1;
  if (isOtherIndex && (!otherText || !otherText.trim())) {
    throw new Error('Text is required for the "Other" option');
  }
  q.votes[optionIndex]++;
  if (isOtherIndex && otherText) {
    q.otherTexts.push(otherText.trim());
  }
  q.updatedAt = Date.now();
  touch();
}

export function resetSession(): void {
  const store = getStore();
  store.questions = [];
  store.activeQuestionId = null;
  store.lastClosedQuestionId = null;
  touch();
}

import { createClient } from 'redis';

export interface Question {
  id: string;
  text: string;
  options: string[];
  status: 'draft' | 'open' | 'closed';
  votes: number[];
  allowOther: boolean;
  otherTexts: string[];
  multipleChoice: boolean;
  updatedAt: number;
}

export interface SessionState {
  questions: Question[];
  activeQuestionId: string | null;
  lastClosedQuestionId: string | null;
  version: number;
}

const REDIS_KEY = 'pulsecheck:session';

const redis = await createClient({ url: process.env.REDIS_URL }).connect();

const DEFAULT_STATE: SessionState = {
  questions: [],
  activeQuestionId: null,
  lastClosedQuestionId: null,
  version: 0,
};

async function readState(): Promise<SessionState> {
  const raw = await redis.get(REDIS_KEY);
  return raw ? JSON.parse(raw) : { ...DEFAULT_STATE };
}

async function writeState(state: SessionState): Promise<void> {
  await redis.set(REDIS_KEY, JSON.stringify(state));
}

export async function getState(): Promise<SessionState> {
  return readState();
}

export async function addQuestion(
  text: string,
  options: string[],
  allowOther = false,
  multipleChoice = false,
): Promise<Question> {
  const state = await readState();
  const allOptions = allowOther ? [...options, 'Other'] : options;
  const q: Question = {
    id: crypto.randomUUID(),
    text,
    options: allOptions,
    status: 'draft',
    votes: new Array(allOptions.length).fill(0),
    allowOther,
    otherTexts: [],
    multipleChoice,
    updatedAt: Date.now(),
  };
  state.questions.push(q);
  state.version++;
  await writeState(state);
  return q;
}

export async function openQuestion(id: string): Promise<Question> {
  const state = await readState();
  const q = state.questions.find((q) => q.id === id);
  if (!q) throw new Error('Question not found');

  const now = Date.now();
  for (const other of state.questions) {
    if (other.status === 'open') {
      other.status = 'closed';
      other.updatedAt = now;
    }
  }

  q.status = 'open';
  q.votes = new Array(q.options.length).fill(0);
  q.otherTexts = [];
  q.updatedAt = now;
  state.activeQuestionId = id;
  state.version++;
  await writeState(state);
  return q;
}

export async function closeQuestion(): Promise<Question | null> {
  const state = await readState();
  if (!state.activeQuestionId) return null;
  const q = state.questions.find((q) => q.id === state.activeQuestionId);
  if (!q) return null;

  q.status = 'closed';
  q.updatedAt = Date.now();
  state.lastClosedQuestionId = state.activeQuestionId;
  state.activeQuestionId = null;
  state.version++;
  await writeState(state);
  return q;
}

export async function recordVote(
  questionId: string,
  optionIndex: number,
  otherText?: string,
): Promise<void> {
  const state = await readState();
  const q = state.questions.find((q) => q.id === questionId);
  if (!q) throw new Error('Question not found');
  if (q.status !== 'open') throw new Error('Question is not open');
  if (optionIndex < 0 || optionIndex >= q.options.length) {
    throw new Error('Invalid option index');
  }
  const isOtherIndex = q.allowOther && optionIndex === q.options.length - 1;
  if (isOtherIndex && !otherText?.trim()) {
    throw new Error('Text is required for the "Other" option');
  }
  q.votes[optionIndex]++;
  if (isOtherIndex && otherText) {
    q.otherTexts.push(otherText.trim());
  }
  q.updatedAt = Date.now();
  state.version++;
  await writeState(state);
}

export async function recordVotes(
  questionId: string,
  optionIndices: number[],
  otherText?: string,
): Promise<void> {
  const state = await readState();
  const q = state.questions.find((q) => q.id === questionId);
  if (!q) throw new Error('Question not found');
  if (q.status !== 'open') throw new Error('Question is not open');
  if (optionIndices.length === 0) throw new Error('At least one option must be selected');

  const otherIdx = q.allowOther ? q.options.length - 1 : -1;

  for (const idx of optionIndices) {
    if (idx < 0 || idx >= q.options.length) {
      throw new Error('Invalid option index');
    }
  }

  const includesOther = otherIdx >= 0 && optionIndices.includes(otherIdx);
  if (includesOther && !otherText?.trim()) {
    throw new Error('Text is required for the "Other" option');
  }

  for (const idx of optionIndices) {
    q.votes[idx]++;
  }
  if (includesOther && otherText) {
    q.otherTexts.push(otherText.trim());
  }
  q.updatedAt = Date.now();
  state.version++;
  await writeState(state);
}

export async function deleteQuestion(id: string): Promise<void> {
  const state = await readState();
  state.questions = state.questions.filter((q) => q.id !== id);
  if (state.activeQuestionId === id) state.activeQuestionId = null;
  if (state.lastClosedQuestionId === id) state.lastClosedQuestionId = null;
  state.version++;
  await writeState(state);
}

export async function resetSession(): Promise<void> {
  await writeState({ ...DEFAULT_STATE, version: 0 });
}

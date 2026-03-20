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

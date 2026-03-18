'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { BarChart } from '@/components/BarChart';

interface Question {
  id: string;
  text: string;
  options: string[];
  status: 'draft' | 'open' | 'closed';
  votes: number[];
}

interface SessionState {
  questions: Question[];
  activeQuestionId: string | null;
  lastClosedQuestionId: string | null;
  version: number;
}

export default function AudiencePage() {
  const [state, setState] = useState<SessionState | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;

    es.addEventListener('state', (e) => {
      const data: SessionState = JSON.parse(e.data);
      setState(data);
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        esRef.current = new EventSource('/api/events');
        const retry = esRef.current;
        retry.addEventListener('state', (e) => {
          setState(JSON.parse(e.data));
        });
      }, 2000);
    };

    return () => {
      es.close();
    };
  }, []);

  const activeQuestion = state?.questions.find(
    (q) => q.id === state.activeQuestionId,
  );
  const lastClosedQuestion = state?.questions.find(
    (q) => q.id === state.lastClosedQuestionId,
  );

  async function handleVote(questionId: string, optionIndex: number) {
    setVoting(true);
    setError(null);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionIndex }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Vote failed');
      }
      setVotedIds((prev) => new Set(prev).add(questionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      setVoting(false);
    }
  }

  const hasVoted = activeQuestion ? votedIds.has(activeQuestion.id) : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-lg font-semibold tracking-wider text-white/60 uppercase">
          PulseCheck
        </h1>

        {!state && (
          <Card className="text-center">
            <p className="animate-pulse text-xl text-white/75">
              Connecting...
            </p>
          </Card>
        )}

        {state && activeQuestion && !hasVoted && (
          <Card>
            <h2 className="mb-6 text-center text-3xl font-bold text-white">
              {activeQuestion.text}
            </h2>
            <div className="space-y-3">
              {activeQuestion.options.map((option, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  disabled={voting}
                  className="w-full justify-center py-4 text-lg"
                  onClick={() => handleVote(activeQuestion.id, i)}
                >
                  {option}
                </Button>
              ))}
            </div>
            {error && (
              <p className="mt-4 text-center text-sm text-red-400">{error}</p>
            )}
          </Card>
        )}

        {state && activeQuestion && hasVoted && (
          <Card className="text-center">
            <div className="py-8">
              <div className="mb-4 text-5xl">&#10003;</div>
              <h2 className="text-2xl font-bold text-white">Vote received!</h2>
              <p className="mt-2 text-white/60">
                Waiting for results...
              </p>
            </div>
          </Card>
        )}

        {state && !activeQuestion && lastClosedQuestion && (
          <Card>
            <h2 className="mb-6 text-center text-2xl font-bold text-white">
              {lastClosedQuestion.text}
            </h2>
            <BarChart
              options={lastClosedQuestion.options}
              votes={lastClosedQuestion.votes}
            />
          </Card>
        )}

        {state &&
          !activeQuestion &&
          !lastClosedQuestion && (
            <Card className="text-center">
              <div className="py-12">
                <div className="mb-4 inline-block h-3 w-3 animate-pulse rounded-full bg-[#7E5BB6]" />
                <p className="text-2xl font-medium text-white/75">
                  Waiting for the next question&hellip;
                </p>
              </div>
            </Card>
          )}
      </div>
    </main>
  );
}

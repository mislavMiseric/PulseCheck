'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { BarChart } from '@/components/BarChart';

interface Question {
  id: string;
  text: string;
  options: string[];
  status: 'draft' | 'open' | 'closed';
  votes: number[];
  allowOther: boolean;
  otherTexts: string[];
}

interface SessionState {
  questions: Question[];
  activeQuestionId: string | null;
  lastClosedQuestionId: string | null;
  version: number;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch('/api/admin/status', { credentials: 'include' }).then((res) => {
      setAuthed(res.ok);
    });
  }, []);

  useEffect(() => {
    if (!authed) return;
    const es = new EventSource('/api/events');
    esRef.current = es;
    es.addEventListener('state', (e) => {
      setState(JSON.parse(e.data));
    });
    es.onerror = () => {
      es.close();
      setTimeout(() => {
        const retry = new EventSource('/api/events');
        esRef.current = retry;
        retry.addEventListener('state', (e) => {
          setState(JSON.parse(e.data));
        });
      }, 2000);
    };
    return () => es.close();
  }, [authed]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="animate-pulse text-white/75">Loading...</p>
      </main>
    );
  }

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Dashboard
      state={state}
      toast={toast}
      showToast={showToast}
      onLogout={() => {
        fetch('/api/admin/logout', {
          method: 'POST',
          credentials: 'include',
        }).then(() => {
          esRef.current?.close();
          setAuthed(false);
          setState(null);
        });
      }}
    />
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-white">
          PulseCheck Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="mb-1 block text-sm text-white/75">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-[#7E5BB6]"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm text-white/75">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-[#7E5BB6]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </main>
  );
}

function Dashboard({
  state,
  toast,
  showToast,
  onLogout,
}: {
  state: SessionState | null;
  toast: string | null;
  showToast: (msg: string) => void;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">PulseCheck Admin</h1>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </header>

        {toast && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            {toast}
          </div>
        )}

        <CreateQuestionForm showToast={showToast} />

        {state && (
          <>
            <ActiveControls state={state} showToast={showToast} />
            <QuestionList state={state} showToast={showToast} />
          </>
        )}

        {!state && (
          <Card className="mt-6 text-center">
            <p className="animate-pulse text-white/75">
              Connecting to live state...
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}

function CreateQuestionForm({
  showToast,
}: {
  showToast: (msg: string) => void;
}) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowOther, setAllowOther] = useState(false);
  const [loading, setLoading] = useState(false);

  function addOption() {
    if (options.length < 6) setOptions([...options, '']);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, options, allowOther }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      setText('');
      setOptions(['', '']);
      setAllowOther(false);
      showToast('Question created');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Create Question
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question-text" className="mb-1 block text-sm text-white/75">
            Question Text
          </label>
          <input
            id="question-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            placeholder="e.g. What is your favorite framework?"
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-[#7E5BB6]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/75">
            Options ({options.length}/6)
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  required
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/30 outline-none focus:border-[#7E5BB6]"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="rounded-lg px-3 text-red-400 hover:bg-red-500/10"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-[#9B76D4] hover:text-white"
            >
              + Add option
            </button>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={allowOther}
            onChange={(e) => setAllowOther(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#7E5BB6]"
          />
          <span className="text-sm text-white/75">
            Allow &ldquo;Other&rdquo; (free-text) option
          </span>
        </label>

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Creating...' : 'Create Question'}
        </Button>
      </form>
    </Card>
  );
}

function ActiveControls({
  state,
  showToast,
}: {
  state: SessionState;
  showToast: (msg: string) => void;
}) {
  const activeQ = state.questions.find(
    (q) => q.id === state.activeQuestionId,
  );
  const [confirmReset, setConfirmReset] = useState(false);

  async function handleClose() {
    const res = await fetch('/api/admin/close', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) showToast('Question closed');
    else showToast('Failed to close question');
  }

  async function handleReset() {
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      showToast('Session reset');
      setConfirmReset(false);
    } else {
      showToast('Failed to reset');
    }
  }

  return (
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Controls</h2>

      {activeQ ? (
        <div className="space-y-3">
          <p className="text-white/75">
            Currently open:{' '}
            <span className="font-medium text-white">{activeQ.text}</span>
          </p>
          <div className="mb-3">
            <BarChart options={activeQ.options} votes={activeQ.votes} otherTexts={activeQ.otherTexts} />
          </div>
          <Button onClick={handleClose} className="w-full justify-center">
            Close Current Question
          </Button>
        </div>
      ) : (
        <p className="text-white/60">No question currently open.</p>
      )}

      <div className="mt-4 border-t border-white/10 pt-4">
        {!confirmReset ? (
          <Button
            variant="danger"
            onClick={() => setConfirmReset(true)}
            className="w-full justify-center"
          >
            Reset Session
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={handleReset}
              className="flex-1 justify-center"
            >
              Confirm Reset
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmReset(false)}
              className="flex-1 justify-center"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuestionList({
  state,
  showToast,
}: {
  state: SessionState;
  showToast: (msg: string) => void;
}) {
  async function handleOpen(questionId: string) {
    const res = await fetch('/api/admin/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId }),
      credentials: 'include',
    });
    if (res.ok) showToast('Question opened');
    else showToast('Failed to open question');
  }

  if (state.questions.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-white">Questions</h2>
      <div className="space-y-3">
        {state.questions.map((q) => (
          <Card key={q.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Badge status={q.status} />
                <span className="truncate font-medium text-white">
                  {q.text}
                </span>
              </div>
              <p className="text-sm text-white/50">
                {q.options.join(' / ')}
              </p>
              {q.allowOther && (
                <span className="mt-1 inline-block text-xs text-[#9B76D4]">
                  + Other (free-text)
                </span>
              )}
              {q.status === 'closed' && (
                <p className="mt-1 text-xs text-white/40">
                  Votes: {q.votes.join(', ')}
                  {q.otherTexts.length > 0 && (
                    <> &middot; Other responses: {q.otherTexts.join(', ')}</>
                  )}
                </p>
              )}
            </div>
            {q.status !== 'open' && (
              <Button
                variant="primary"
                onClick={() => handleOpen(q.id)}
                className="shrink-0"
              >
                Open
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

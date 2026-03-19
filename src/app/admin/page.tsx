'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { BarChart } from '@/components/BarChart';
import { mergeState, type SessionState } from '@/lib/merge-state';

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
    let cancelled = false;

    function connectSSE() {
      if (cancelled) return;
      const es = new EventSource('/api/events');
      esRef.current = es;
      es.addEventListener('state', (e) => {
        const incoming: SessionState = JSON.parse(e.data);
        setState((prev) => mergeState(prev, incoming));
      });
      es.onerror = () => {
        es.close();
        if (!cancelled) setTimeout(connectSSE, 2000);
      };
    }

    connectSSE();

    const reconnectTimer = setInterval(() => {
      if (!cancelled) {
        esRef.current?.close();
        connectSSE();
      }
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(reconnectTimer);
      esRef.current?.close();
    };
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
      setState={setState}
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
          {process.env.NEXT_PUBLIC_APP_NAME || 'PulseCheck'} Admin
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

type SetState = React.Dispatch<React.SetStateAction<SessionState | null>>;

function Dashboard({
  state,
  setState,
  toast,
  showToast,
  onLogout,
}: {
  state: SessionState | null;
  setState: SetState;
  toast: string | null;
  showToast: (msg: string) => void;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{process.env.NEXT_PUBLIC_APP_NAME || 'PulseCheck'} Admin</h1>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </header>

        {toast && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300">
            {toast}
          </div>
        )}

        <CreateQuestionForm showToast={showToast} setState={setState} />

        {state && (
          <>
            <ActiveControls state={state} setState={setState} showToast={showToast} />
            <QuestionList state={state} setState={setState} showToast={showToast} />
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
  setState,
}: {
  showToast: (msg: string) => void;
  setState: SetState;
}) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowOther, setAllowOther] = useState(false);
  const [multipleChoice, setMultipleChoice] = useState(false);
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
        body: JSON.stringify({ text, options, allowOther, multipleChoice }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      const data = await res.json();
      setState((prev) =>
        prev
          ? { ...prev, questions: [...prev.questions, data.question], version: prev.version + 1 }
          : { questions: [data.question], activeQuestionId: null, lastClosedQuestionId: null, version: 1 },
      );
      setText('');
      setOptions(['', '']);
      setAllowOther(false);
      setMultipleChoice(false);
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

        <div className="space-y-2">
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

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={multipleChoice}
              onChange={(e) => setMultipleChoice(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#7E5BB6]"
            />
            <span className="text-sm text-white/75">
              Multiple choice (allow selecting multiple options)
            </span>
          </label>
        </div>

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? 'Creating...' : 'Create Question'}
        </Button>
      </form>
    </Card>
  );
}

function ActiveControls({
  state,
  setState,
  showToast,
}: {
  state: SessionState;
  setState: SetState;
  showToast: (msg: string) => void;
}) {
  const activeQ = state.questions.find(
    (q) => q.id === state.activeQuestionId,
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [closing, setClosing] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleClose() {
    setClosing(true);
    try {
      const res = await fetch('/api/admin/close', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: prev.questions.map((q) => (q.id === data.question.id ? data.question : q)),
            activeQuestionId: null,
            lastClosedQuestionId: data.question.id,
            version: prev.version + 1,
          };
        });
        showToast('Question closed');
      } else {
        showToast('Failed to close question');
      }
    } finally {
      setClosing(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setState({ questions: [], activeQuestionId: null, lastClosedQuestionId: null, version: 0 });
        showToast('Session reset');
        setConfirmReset(false);
      } else {
        showToast('Failed to reset');
      }
    } finally {
      setResetting(false);
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
          <Button onClick={handleClose} disabled={closing} className="w-full justify-center">
            {closing ? 'Closing...' : 'Close Current Question'}
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
              disabled={resetting}
              className="flex-1 justify-center"
            >
              {resetting ? 'Resetting...' : 'Confirm Reset'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmReset(false)}
              disabled={resetting}
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
  setState,
  showToast,
}: {
  state: SessionState;
  setState: SetState;
  showToast: (msg: string) => void;
}) {
  const [opening, setOpening] = useState<string | null>(null);

  async function handleOpen(questionId: string) {
    setOpening(questionId);
    try {
      const res = await fetch('/api/admin/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: prev.questions.map((q) => {
              if (q.id === data.question.id) return data.question;
              if (q.status === 'open') return { ...q, status: 'closed' as const };
              return q;
            }),
            activeQuestionId: data.question.id,
            version: prev.version + 1,
          };
        });
        showToast('Question opened');
      } else {
        showToast('Failed to open question');
      }
    } finally {
      setOpening(null);
    }
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
              <div className="mt-1 flex flex-wrap gap-2">
                {q.multipleChoice && (
                  <span className="inline-block text-xs text-[#9B76D4]">
                    Multiple choice
                  </span>
                )}
                {q.allowOther && (
                  <span className="inline-block text-xs text-[#9B76D4]">
                    + Other (free-text)
                  </span>
                )}
              </div>
              {q.status === 'closed' && (
                <p className="mt-1 text-xs text-white/40">
                  Votes: {q.votes.join(', ')}
                  {q.otherTexts.length > 0 && (
                    <> &middot; Other responses: {q.otherTexts.join(', ')}</>
                  )}
                </p>
              )}
            </div>
            {q.status === 'draft' && (
              <Button
                variant="primary"
                onClick={() => handleOpen(q.id)}
                disabled={opening !== null}
                className="shrink-0"
              >
                {opening === q.id ? 'Opening...' : 'Open'}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

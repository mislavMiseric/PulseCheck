type Status = 'draft' | 'open' | 'closed';

interface BadgeProps {
  status: Status;
}

const statusStyles: Record<Status, string> = {
  draft: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  open: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  closed: 'bg-white/10 text-white/60 border-white/20',
};

export function Badge({ status }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

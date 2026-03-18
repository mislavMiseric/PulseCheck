interface BarChartProps {
  options: string[];
  votes: number[];
}

export function BarChart({ options, votes }: BarChartProps) {
  const total = votes.reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...votes, 1);

  return (
    <div className="space-y-4">
      {options.map((option, i) => {
        const count = votes[i];
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
        const width = total > 0 ? (count / maxVotes) * 100 : 0;

        return (
          <div key={i}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-lg font-medium text-white">{option}</span>
              <span className="text-sm text-white/75">
                {count} vote{count !== 1 ? 's' : ''} &middot; {pct}%
              </span>
            </div>
            <div className="h-8 w-full overflow-hidden rounded-lg bg-white/10">
              <div
                className="flex h-full items-center rounded-lg bg-gradient-to-r from-[#7E5BB6] to-[#9B76D4] transition-all duration-700 ease-out"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-2 text-center text-sm text-white/60">
        {total} total vote{total !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

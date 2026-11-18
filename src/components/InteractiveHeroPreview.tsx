import { useState } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';
import { MarkdownRenderer } from './MarkdownRenderer';

export function InteractiveHeroPreview({
  onLaunchApp,
  measuredLatency = '—',
}: {
  onLaunchApp: () => void;
  measuredLatency?: string;
}) {
  const [demoText, setDemoText] = useState(
    "# Engineering notes\n\n- [x] Configure IndexedDB reactive layer\n- [ ] Benchmark local storage latency\n- [ ] Serialize offline mutation queue\n\nAll mutations commit locally to IndexedDB with zero blocking."
  );

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 md:mt-12 text-left">
      <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-4 md:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-primary)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-primary)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-primary)]" />
            <span className="caption-3 font-mono ml-2 text-[var(--text-tertiary)]">interactive workspace preview</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="caption-3 font-mono text-[var(--text-success)] font-semibold">
              {measuredLatency !== '—' ? `${measuredLatency} client write latency` : 'IndexedDB local write'}
            </span>
            <button
              onClick={onLaunchApp}
              className="caption-1 py-1 px-2.5 rounded-lg bg-[var(--surface-primary-subtle)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] hover:text-[var(--text-info)] active:scale-[0.98] transition-colors flex items-center gap-1 cursor-pointer"
            >
              Expand to studio <ArrowUpRight className="w-3.5 h-3.5 text-[var(--surface-accent)]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="caption-4 mb-1 font-mono text-[var(--text-subtle)]">Raw markdown editor</label>
            <textarea
              value={demoText}
              onChange={(e) => setDemoText(e.target.value)}
              className="w-full h-44 md:h-52 bg-[var(--surface-base)] border border-[var(--border-primary)] rounded-lg p-3 text-xs font-mono text-[var(--text-primary)] leading-relaxed resize-none focus:outline-none focus:border-[var(--border-action-primary)] custom-scroll"
              placeholder="Type markdown here..."
            />
          </div>

          <div className="flex flex-col">
            <label className="caption-4 mb-1 font-mono text-[var(--text-subtle)]">Live rendered preview</label>
            <div className="w-full h-44 md:h-52 bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] rounded-lg p-3 text-xs text-[var(--text-primary)] leading-relaxed overflow-y-auto custom-scroll">
              <MarkdownRenderer content={demoText} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


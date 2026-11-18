import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle } from '@phosphor-icons/react';

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) {
    return <span className="caption-4 text-[var(--text-subtle)]">No content to preview...</span>;
  }

  return (
    <div className="space-y-2 max-w-none text-xs leading-relaxed text-[var(--text-secondary)]">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <div className="pb-1 mt-3 mb-1 border-b border-[var(--border-primary)]">
              <h1 className="heading-6 text-[var(--text-primary)]">{children}</h1>
            </div>
          ),
          h2: ({ children }) => (
            <div className="pb-1 mt-2.5 mb-1 border-b border-[var(--border-primary)]">
              <h2 className="title-2 text-[var(--text-primary)]">{children}</h2>
            </div>
          ),
          h3: ({ children }) => (
            <h3 className="title-3 text-[var(--text-info)] mt-2 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed my-1">{children}</p>
          ),
          ul: ({ children }) => <ul className="space-y-1 my-1 pl-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 my-1 pl-4 text-xs">{children}</ol>,
          li: ({ children, ...props }: any) => {
            const checked = props.checked;
            if (typeof checked === 'boolean') {
              return (
                <li className="flex items-center gap-2 text-xs font-mono py-0.5 list-none">
                  {checked ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-[var(--text-success)]" />
                      <span className="line-through text-[var(--text-subtle)]">{children}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3.5 h-3.5 rounded border border-[var(--border-primary)] shrink-0 bg-[var(--surface-primary-subtle)]" />
                      <span className="text-[var(--text-primary)]">{children}</span>
                    </>
                  )}
                </li>
              );
            }
            return (
              <li className="flex items-start gap-2 text-xs text-[var(--text-secondary)] py-0.5">
                <span className="text-[var(--text-info)] shrink-0">•</span>
                <span>{children}</span>
              </li>
            );
          },
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] font-mono text-[11px] text-[var(--text-info)]">
                  {children}
                </code>
              );
            }
            return (
              <div className="bg-[var(--surface-primary-subtle)] p-2.5 rounded-lg text-xs font-mono text-[var(--text-info)] border border-[var(--border-primary)] overflow-x-auto my-2">
                <code>{children}</code>
              </div>
            );
          },
          hr: () => <hr className="w-full border-t border-[var(--border-primary)] my-3" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full divide-y divide-[var(--border-primary)] text-left border border-[var(--border-primary)] rounded-lg">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-primary-subtle)] border-b border-[var(--border-primary)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-[var(--text-info)] underline hover:text-[var(--core-primary-350)]">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}


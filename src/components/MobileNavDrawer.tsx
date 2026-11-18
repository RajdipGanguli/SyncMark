import { motion } from 'framer-motion';
import { ArrowUpRight } from '@phosphor-icons/react';
import type { ViewRoute } from '../App';

export function MobileNavDrawer({
  isOpen,
  onClose,
  activePage,
  onSelectPage,
  onLaunchApp,
}: {
  isOpen: boolean;
  onClose: () => void;
  activePage: string;
  onSelectPage: (page: ViewRoute) => void;
  onLaunchApp: () => void;
}) {
  if (!isOpen) return null;

  const links: Array<{ id: ViewRoute; label: string }> = [
    { id: 'home', label: 'Overview' },
    { id: 'features', label: 'Architecture' },
    { id: 'benchmarks', label: 'Stress lab' },
    { id: 'docs', label: 'Docs' },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-[var(--surface-primary)]/95 backdrop-blur-xl h-[100dvh] flex flex-col p-6 pt-24 md:hidden">
      <nav className="flex flex-col gap-2">
        {links.map((link, idx) => {
          const isActive = activePage === link.id;
          return (
            <motion.button
              key={link.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={() => {
                onSelectPage(link.id);
                onClose();
              }}
              className={`text-left title-1 py-3 px-4 rounded-xl border transition cursor-pointer ${
                isActive
                  ? 'bg-[var(--action-primary)] border-[var(--border-action-primary)] text-[var(--core-gray-00)] font-semibold'
                  : 'bg-transparent border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {link.label}
            </motion.button>
          );
        })}
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: links.length * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mt-8 pt-8 border-t border-[var(--border-primary)]"
      >
        <button
          onClick={() => {
            onLaunchApp();
            onClose();
          }}
          className="w-full py-2 px-3 rounded-xl bg-[var(--action-primary)] text-[var(--core-gray-00)] button-md font-semibold hover:bg-[var(--action-primary-hover)] active:scale-[0.98] transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          Open studio app <ArrowUpRight className="w-4 h-4 text-[var(--core-accent-200)]" />
        </button>
      </motion.div>
    </div>
  );
}

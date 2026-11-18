import {
  ArrowClockwise,
  ArrowLeft,
  ArrowUpRight,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Cpu,
  Database,
  DownloadSimple,
  Eye,
  FolderOpen,
  Gear,
  GitFork,
  HardDrive,
  Lightning,
  List,
  ListChecks,
  MagicWand,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Pulse,
  Robot,
  ShareNetwork,
  ShieldCheck,
  Sparkle,
  Stack,
  Trash,
  WifiHigh,
  WifiSlash,
  X
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDbMigration, type Note, type SyncQueueItem, SHOWCASE_SEEDS } from './db';
import { syncEngine } from './services/syncEngine';
import { processNoteWithAI, type AIAction } from './services/aiService';
import { SyncMarkLogo } from './components/SyncMarkLogo';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { Hero3DCanvas } from './components/Hero3DCanvas';
import { TaglineReveal } from './components/TaglineReveal';
import { InteractiveHeroPreview } from './components/InteractiveHeroPreview';
import { MobileNavDrawer } from './components/MobileNavDrawer';

export type ViewRoute = 'home' | 'features' | 'benchmarks' | 'docs' | 'privacy' | 'terms' | '404';
export type StudioTab = 'editor' | 'telemetry' | 'playground' | 'settings';







export default function App() {
  const [mainMode, setMainMode] = useState<'landing' | 'app'>('landing');
  const [viewRoute, setViewRoute] = useState<ViewRoute>('home');
  const [studioTab, setStudioTab] = useState<StudioTab>('editor');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Benchmarks & metrics state
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchProgress, setBenchProgress] = useState(0);
  const [benchOpsPerSec, setBenchOpsPerSec] = useState<number | null>(null);
  const [measuredWriteMs, setMeasuredWriteMs] = useState<number | null>(() => syncEngine.medianWriteMs());

  // Dexie live queries (replaces localStorage)
  const rawNotes = useLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().filter((n) => !n.deleted).toArray(),
    []
  );
  const notes = rawNotes ?? [];

  const rawQueue = useLiveQuery(
    () => db.syncQueue.orderBy('createdAt').toArray(),
    []
  );
  const queue = rawQueue ?? [];

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('seed-architecture-spec');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiResultModal, setAiResultModal] = useState<{ title: string; body: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // One-time database migration from localStorage / seed documents
  useEffect(() => {
    initDbMigration();
  }, []);

  // Subscribe to sync engine syncing state
  useEffect(() => {
    return syncEngine.subscribe(setIsSyncing);
  }, []);

  // Online / offline lifecycle
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncEngine.sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeNote = useMemo(() => notes.find((n) => n.id === selectedNoteId), [notes, selectedNoteId]);
  const activeNoteId = activeNote?.id;
  const currentSelectedIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize title/content into editor only when switching active notes (prevents cursor jump)
  useEffect(() => {
    if (activeNote && activeNote.id !== currentSelectedIdRef.current) {
      currentSelectedIdRef.current = activeNote.id;
      setTitle(activeNote.title);
      setContent(activeNote.content);
    } else if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [selectedNoteId, activeNoteId, notes.length]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Debounced auto-save directly to Dexie + SyncQueue (250ms)
  const handleAutoSave = (newTitle: string, newContent: string) => {
    setTitle(newTitle);
    setContent(newContent);

    if (!activeNote) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      await syncEngine.saveNoteLocally({
        ...activeNote,
        title: newTitle || 'Untitled document',
        content: newContent,
      });
      setMeasuredWriteMs(syncEngine.medianWriteMs());
    }, 250);
  };

  const handleCreateNew = async () => {
    const newNote = await syncEngine.createNote();
    currentSelectedIdRef.current = newNote.id;
    setSelectedNoteId(newNote.id);
    setTitle(newNote.title);
    setContent(newNote.content);
    setMainMode('app');
    setStudioTab('editor');
    setMeasuredWriteMs(syncEngine.medianWriteMs());
  };

  const handleDeleteNote = async (noteId: string) => {
    await syncEngine.deleteNoteLocally(noteId);
    setMeasuredWriteMs(syncEngine.medianWriteMs());
    if (selectedNoteId === noteId) {
      const remaining = notes.filter((n) => n.id !== noteId);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
        currentSelectedIdRef.current = remaining[0].id;
        setTitle(remaining[0].title);
        setContent(remaining[0].content);
      } else {
        setSelectedNoteId('');
        currentSelectedIdRef.current = null;
        setTitle('');
        setContent('');
      }
    }
  };

  const handleDuplicateNote = async () => {
    if (!activeNote) return;
    const duplicated = await syncEngine.duplicateNote({
      ...activeNote,
      title,
      content,
    });
    currentSelectedIdRef.current = duplicated.id;
    setSelectedNoteId(duplicated.id);
    setTitle(duplicated.title);
    setContent(duplicated.content);
    setMeasuredWriteMs(syncEngine.medianWriteMs());
  };

  const triggerSyncQueue = () => {
    syncEngine.sync();
  };

  const handleDownloadMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_') || 'document'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerAI = async (action: AIAction) => {
    if (!content.trim()) {
      alert('Please type notes or select a populated document first.');
      return;
    }
    setIsAiProcessing(true);
    try {
      const result = await processNoteWithAI(content, action);
      const labels: Record<AIAction, string> = {
        summarize: 'Executive summary',
        actionItems: 'Actionable tasks',
        polish: 'Polished technical prose',
        expand: 'Architectural expansion'
      };
      setAiResultModal({ title: labels[action], body: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI request failed';
      alert(msg);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>(['All']);
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'All' || n.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  // Real Dexie stress lab benchmark runner
  const runStressTest = async () => {
    if (benchRunning) return;
    setBenchRunning(true);
    setBenchProgress(0);
    try {
      const result = await syncEngine.runRealBenchmark(200, (p) => {
        setBenchProgress(p);
      });
      setBenchOpsPerSec(result.opsPerSec);
      setMeasuredWriteMs(syncEngine.medianWriteMs());
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setBenchRunning(false);
    }
  };

  // ==========================================
  // LANDING PAGE VIEW (LAYOUT A)
  // ==========================================
  if (mainMode === 'landing') {
    return (
      <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden bg-[var(--surface-base)] text-[var(--text-primary)] selection:bg-[var(--surface-secondary-subtle)] selection:text-[var(--core-primary-350)]">
        {/* Skip to Content for Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[60] py-2 px-3 bg-[var(--surface-primary-subtle)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-lg"
        >
          Skip to content
        </a>

        {/* Root level 3D background canvas covering full viewport */}
        <Hero3DCanvas />

        {/* Floating Centered Pill Navbar */}
        <header className="sticky top-4 z-50 max-w-6xl mx-auto px-4 w-full">
          <div className="flex items-center justify-between px-4 md:px-6 py-2.5 rounded-full bg-[var(--surface-primary)]/90 border border-[var(--border-primary)] backdrop-blur-xl shadow-2xl">
            {/* Logo */}
            <button
              onClick={() => {
                setViewRoute('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 text-left cursor-pointer"
            >
              <SyncMarkLogo size={28} />
              <span className="title-2 text-[var(--text-primary)]">SyncMark</span>
              <span className="caption-3 font-mono bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] px-2 py-0.5 rounded-full text-[var(--text-info)]">
                v2.0 PWA
              </span>
            </button>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-[var(--surface-base)] border border-[var(--border-primary)] rounded-full p-1 text-xs">
              <button
                onClick={() => {
                  setViewRoute('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`py-1.5 px-3 rounded-full transition cursor-pointer button-sm ${
                  viewRoute === 'home'
                    ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewRoute('features')}
                className={`py-1.5 px-3 rounded-full transition cursor-pointer button-sm ${
                  viewRoute === 'features'
                    ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Architecture
              </button>
              <button
                onClick={() => setViewRoute('benchmarks')}
                className={`py-1.5 px-3 rounded-full transition cursor-pointer button-sm ${
                  viewRoute === 'benchmarks'
                    ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Stress lab
              </button>
              <button
                onClick={() => setViewRoute('docs')}
                className={`py-1.5 px-3 rounded-full transition cursor-pointer button-sm ${
                  viewRoute === 'docs'
                    ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Docs
              </button>
            </nav>

            {/* Primary Action and Mobile Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMainMode('app');
                  setStudioTab('editor');
                }}
                className="py-2 px-3 rounded-full bg-[var(--action-primary)] text-[var(--core-gray-00)] button-sm font-semibold hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-click)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--border-action-primary)] transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-lg shadow-[var(--core-primary-500)]/20"
              >
                Open studio app <ArrowUpRight className="w-3.5 h-3.5 text-[var(--core-accent-200)]" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden w-9 h-9 rounded-full bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] text-[var(--text-primary)] flex items-center justify-center active:scale-[0.98] transition cursor-pointer"
              >
                <div
                  style={{
                    transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  {mobileMenuOpen ? <X className="w-4 h-4 text-[var(--text-info)]" /> : <List className="w-4 h-4" />}
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <MobileNavDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          activePage={viewRoute}
          onSelectPage={(page) => setViewRoute(page)}
          onLaunchApp={() => {
            setMainMode('app');
            setStudioTab('editor');
          }}
        />

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 w-full flex flex-col z-10">
          <AnimatePresence mode="wait">

            {/* ROUTE 1: OVERVIEW (LAYOUT A STRATEGY) */}
            {viewRoute === 'home' && (
              <motion.div
                key="home-route"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col"
              >
                {/* 1. HERO SECTION */}
                <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 md:pt-16 pb-12 text-center w-full">
                  {/* Concrete Proof Metric Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-primary)] border border-[var(--border-primary)] text-[var(--text-info)] font-mono text-xs mb-6">
                    <span className="w-2 h-2 rounded-full bg-[var(--surface-success)] animate-pulse" />
                    <span>{measuredWriteMs !== null ? `${measuredWriteMs.toFixed(1)}ms measured write latency` : 'Zero latency local write'}</span>
                  </div>

                  {/* Heading with left to right text gradient */}
                  <h1 className="max-w-[680px] mx-auto heading-2 md:heading-1 font-semibold tracking-tight [text-wrap:balance] bg-gradient-to-r from-[#FFFFFF] to-[#9B9B9B] bg-clip-text text-transparent mb-6">
                    Fast local first markdown workspace with offline sync and AI tools
                  </h1>

                  {/* Subheading */}
                  <p className="max-w-[680px] mx-auto body-3 text-[var(--text-tertiary)] [text-wrap:pretty] mb-8">
                    Engineered for developers and technical writers who require instant client writes, deterministic offline queueing, and local data ownership without cloud lock in.
                  </p>

                  {/* Single Primary CTA (No competing secondary CTAs in hero group) */}
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={() => {
                        setMainMode('app');
                        setStudioTab('editor');
                      }}
                      className="py-2 px-3 rounded-xl bg-[var(--action-primary)] text-[var(--core-gray-00)] button-md font-semibold hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-click)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--border-action-primary)] transition flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xl shadow-[var(--core-primary-500)]/25"
                    >
                      Open studio app <ArrowUpRight className="w-4 h-4 text-[var(--core-accent-200)]" />
                    </button>
                  </div>

                  {/* Interactive Workspace Preview */}
                  <InteractiveHeroPreview
                    onLaunchApp={() => {
                      setMainMode('app');
                      setStudioTab('editor');
                    }}
                    measuredLatency={measuredWriteMs !== null ? `${measuredWriteMs.toFixed(1)}ms` : '—'}
                  />
                </section>

                {/* 2. BENEFITS SECTION */}
                <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 w-full">
                  <div className="text-center max-w-[680px] mx-auto mb-12">
                    <h2 className="heading-4 md:heading-3 font-semibold text-[var(--text-primary)] [text-wrap:balance] mb-3">
                      Core technical benefits
                    </h2>
                    <p className="body-4 text-[var(--text-tertiary)] [text-wrap:pretty]">
                      Engineered with client state authority and resilient background coordination.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--surface-accent)]">
                        <Lightning className="w-5 h-5" />
                      </div>
                      <h3 className="title-2 text-[var(--text-primary)]">Instant disk transactions</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Writes commit directly to browser IndexedDB without waiting for round trip network confirmations.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-info)]">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <h3 className="title-2 text-[var(--text-primary)]">Guaranteed offline queue</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Mutations serialize into a persistent FIFO buffer that survives tab closes and offline network periods.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-success)]">
                        <GitFork className="w-5 h-5" />
                      </div>
                      <h3 className="title-2 text-[var(--text-primary)]">Deterministic conflict resolution</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Monotonic timestamps settle concurrent edits using verified last write wins ordering across all clients.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--core-primary-350)]">
                        <Robot className="w-5 h-5" />
                      </div>
                      <h3 className="title-2 text-[var(--text-primary)]">Local model execution</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Run structured document summarization and task extraction through client orchestrated Gemini inference.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 3. TAGLINE REVEAL SECTION (MANDATORY MID-PAGE STATEMENT) */}
                <TaglineReveal />

                {/* 4. HOW IT WORKS SECTION */}
                <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 w-full">
                  <div className="text-center max-w-[680px] mx-auto mb-12">
                    <h2 className="heading-4 md:heading-3 font-semibold text-[var(--text-primary)] [text-wrap:balance] mb-3">
                      How it works
                    </h2>
                    <p className="body-4 text-[var(--text-tertiary)] [text-wrap:pretty]">
                      Three sequential stages from local keystroke to deterministic cloud synchronization.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="caption-3 font-mono text-[var(--text-info)]">Step 01</span>
                        <Database className="w-5 h-5 text-[var(--surface-accent)]" />
                      </div>
                      <h3 className="title-1 text-[var(--text-primary)]">Local transactional write</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Keystrokes commit atomically to browser IndexedDB with synchronous reactive state updates.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="caption-3 font-mono text-[var(--text-info)]">Step 02</span>
                        <Clock className="w-5 h-5 text-[var(--text-info)]" />
                      </div>
                      <h3 className="title-1 text-[var(--text-primary)]">Offline FIFO queue buffering</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Network dropouts redirect mutations into a persistent FIFO IndexedDB queue with deduplicated keys.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="caption-3 font-mono text-[var(--text-info)]">Step 03</span>
                        <ArrowClockwise className="w-5 h-5 text-[var(--text-success)]" />
                      </div>
                      <h3 className="title-1 text-[var(--text-primary)]">Deterministic sync resolution</h3>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Reconnection triggers asynchronous batch draining with monotonic timestamp settlement and zero remote locks.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 5. CREATOR & ARCHITECTURE PROOF */}
                <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 w-full">
                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 md:p-10 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-primary)]">
                      <div>
                        <h2 className="heading-5 md:heading-4 font-semibold text-[var(--text-primary)] [text-wrap:balance] mb-2">
                          Creator and architecture proof
                        </h2>
                        <p className="body-4 text-[var(--text-tertiary)]">
                          Engineered by Rajdip Ganguli as a solo technical project.
                        </p>
                      </div>

                      <a
                        href="https://github.com/RajdipGanguli"
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] text-[var(--text-primary)] button-sm hover:border-[var(--border-action-primary)] hover:text-[var(--text-info)] active:scale-[0.98] transition inline-flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                      >
                        GitHub profile <ArrowUpRight className="w-4 h-4 text-[var(--surface-accent)]" />
                      </a>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-xl bg-[var(--surface-base)] border border-[var(--border-primary)] p-4 text-center">
                        <div className="font-mono text-2xl md:text-3xl font-semibold text-[var(--text-success)] mb-1">
                          {measuredWriteMs !== null ? `${measuredWriteMs.toFixed(1)}ms` : '—'}
                        </div>
                        <div className="caption-4 text-[var(--text-tertiary)]">Measured client write latency</div>
                      </div>

                      <div className="rounded-xl bg-[var(--surface-base)] border border-[var(--border-primary)] p-4 text-center">
                        <div className="font-mono text-2xl md:text-3xl font-semibold text-[var(--surface-accent)] mb-1">0ms</div>
                        <div className="caption-4 text-[var(--text-tertiary)]">Interface blocking time</div>
                      </div>

                      <div className="rounded-xl bg-[var(--surface-base)] border border-[var(--border-primary)] p-4 text-center">
                        <div className="font-mono text-2xl md:text-3xl font-semibold text-[var(--text-info)] mb-1">100%</div>
                        <div className="caption-4 text-[var(--text-tertiary)]">Offline storage persistence</div>
                      </div>

                      <div className="rounded-xl bg-[var(--surface-base)] border border-[var(--border-primary)] p-4 text-center">
                        <div className="font-mono text-2xl md:text-3xl font-semibold text-[var(--text-secondary)] mb-1">0</div>
                        <div className="caption-4 text-[var(--text-tertiary)]">External telemetry trackers</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 6. FAQ SECTION */}
                <section className="max-w-4xl mx-auto px-4 md:px-8 py-16 w-full">
                  <div className="text-center max-w-[680px] mx-auto mb-12">
                    <h2 className="heading-4 md:heading-3 font-semibold text-[var(--text-primary)] [text-wrap:balance] mb-3">
                      Frequently asked questions
                    </h2>
                    <p className="body-4 text-[var(--text-tertiary)] [text-wrap:pretty]">
                      Technical details on data persistence, conflict handling, and offline behavior.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        q: 'How does local storage work when there is no internet connection?',
                        a: 'Writes persist to IndexedDB immediately, ensuring your documents remain editable and intact during complete network outages.'
                      },
                      {
                        q: 'How are concurrent edits resolved between multiple devices?',
                        a: 'SyncMark employs deterministic last write wins timestamp resolution paired with monotonic clock tracking to eliminate sync forks.'
                      },
                      {
                        q: 'Does SyncMark send personal document data to remote tracking servers?',
                        a: 'No tracking code or analytics scripts exist. All note contents remain strictly on your client device unless you explicitly trigger cloud backup.'
                      },
                      {
                        q: 'What happens when the browser storage limit is approached?',
                        a: 'Modern browsers allocate gigabytes of persistent IndexedDB quota. SyncMark monitors storage usage and automatically warns before quota constraints.'
                      },
                      {
                        q: 'Can SyncMark be installed natively on desktop and mobile devices?',
                        a: 'Yes. SyncMark includes a full web app manifest and service worker, allowing native installation on macOS, Windows, iOS, and Android.'
                      },
                      {
                        q: 'How does document summarization work with Gemini models?',
                        a: 'Document text is dispatched to Gemini flash endpoints with structured schema extraction. When offline, local heuristic routines provide instant fallback.'
                      }
                    ].map((item, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-5 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="title-2 text-[var(--text-primary)]">{item.q}</h3>
                            <div
                              style={{
                                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                              }}
                            >
                              <CaretDown className="w-4 h-4 text-[var(--text-info)] shrink-0" />
                            </div>
                          </div>
                          {isOpen && (
                            <p className="body-4 text-[var(--text-secondary)] mt-3 pt-3 border-t border-[var(--border-primary)]">
                              {item.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 7. RISK REVERSAL & FINAL CTA */}
                <section className="max-w-4xl mx-auto px-4 md:px-8 py-20 text-center w-full">
                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-8 md:p-12 space-y-6">
                    <h2 className="heading-3 md:heading-2 font-semibold text-[var(--text-primary)] [text-wrap:balance]">
                      Start writing with zero cloud lock in
                    </h2>
                    <p className="body-3 text-[var(--text-tertiary)] max-w-xl mx-auto [text-wrap:pretty]">
                      Free local execution with complete data sovereignty. No accounts required, no tracking scripts, and no credit card gates.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setMainMode('app');
                          setStudioTab('editor');
                        }}
                        className="py-2 px-3 rounded-xl bg-[var(--action-primary)] text-[var(--core-gray-00)] button-md font-semibold hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-click)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--border-action-primary)] transition inline-flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xl shadow-[var(--core-primary-500)]/25"
                      >
                        Open studio app <ArrowUpRight className="w-4 h-4 text-[var(--core-accent-200)]" />
                      </button>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* ROUTE 2: ARCHITECTURE DEEP DIVE */}
            {viewRoute === 'features' && (
              <motion.div
                key="features-route"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-8 w-full"
              >
                <div>
                  <h1 className="heading-3 font-semibold text-[var(--text-primary)] mb-2">Distributed architecture specification</h1>
                  <p className="body-4 text-[var(--text-tertiary)]">
                    Technical inspection of the client state machine, monotonic clock tracking, and reconciliation flow.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                    <h2 className="title-1 text-[var(--text-primary)] flex items-center gap-2">
                      <Database className="w-4 h-4 text-[var(--surface-accent)]" /> Client authority model
                    </h2>
                    <p className="body-5 text-[var(--text-tertiary)]">
                      SyncMark treats the browser as the primary source of truth. Every document edit produces a transactional record in IndexedDB before evaluating network connectivity.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                    <h2 className="title-1 text-[var(--text-primary)] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--text-info)]" /> Monotonic logical timestamps
                    </h2>
                    <p className="body-5 text-[var(--text-tertiary)]">
                      Edits increment local logical counters to avoid clock skew vulnerabilities between separate hardware devices during distributed reconciliation.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                    <h2 className="title-1 text-[var(--text-primary)] flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[var(--core-primary-350)]" /> Persistent FIFO buffer
                    </h2>
                    <p className="body-5 text-[var(--text-tertiary)]">
                      Offline operations serialize into a dedicated queue table in IndexedDB, preventing data loss even when tabs or browser sessions terminate abruptly.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 p-6 space-y-3">
                    <h2 className="title-1 text-[var(--text-primary)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[var(--text-success)]" /> Privacy and telemetry boundaries
                    </h2>
                    <p className="body-5 text-[var(--text-tertiary)]">
                      Zero analytical third party SDKs or remote keystroke listeners. Client code runs sandboxed inside the browser application shell.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] space-y-3">
                  <h3 className="title-2 text-[var(--text-primary)]">Consensus algorithm pseudocode</h3>
                  <pre className="bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-primary)] font-mono text-xs text-[var(--text-info)] overflow-x-auto leading-relaxed">
{`// Client-authoritative reconciliation pipeline
function reconcileRecord(localRecord, remoteRecord) {
  if (!remoteRecord) return localRecord;
  if (localRecord.updatedAt >= remoteRecord.updatedAt) {
    return settleState(REMOTE = localRecord.payload);
  }
  return settleState(LOCAL = remoteRecord.payload);
}`}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* ROUTE 3: STRESS LAB & BENCHMARKS */}
            {viewRoute === 'benchmarks' && (
              <motion.div
                key="benchmarks-route"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-8 w-full"
              >
                <div>
                  <h1 className="heading-3 font-semibold text-[var(--text-primary)] mb-2">In browser latency and stress lab</h1>
                  <p className="body-4 text-[var(--text-tertiary)]">
                    Live telemetry comparing client IndexedDB disk writes against remote cloud database round trips.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-2">
                    <div className="caption-4 text-[var(--text-tertiary)]">SyncMark IndexedDB</div>
                    <div className="font-mono text-3xl font-semibold text-[var(--text-success)]">
                      {measuredWriteMs !== null ? `${measuredWriteMs.toFixed(1)}ms` : '—'}
                    </div>
                    <div className="caption-5 text-[var(--text-subtle)]">Measured non blocking write</div>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-2">
                    <div className="caption-4 text-[var(--text-tertiary)]">Standard Cloud REST API</div>
                    <div className="font-mono text-3xl font-semibold text-[var(--text-warning)]">~100–200ms+</div>
                    <div className="caption-5 text-[var(--text-subtle)]">Network round trip latency (typical)</div>
                  </div>

                  <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-2">
                    <div className="caption-4 text-[var(--text-tertiary)]">Cloud GraphQL Endpoint</div>
                    <div className="font-mono text-3xl font-semibold text-[var(--core-red-400)]">~150–300ms+</div>
                    <div className="caption-5 text-[var(--text-subtle)]">Server processing latency (typical)</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="title-1 text-[var(--text-primary)]">Real Dexie write throughput benchmark</h2>
                      <p className="body-5 text-[var(--text-tertiary)]">
                        Executes real IndexedDB transactions with automatic cleanup to evaluate browser disk write throughput.
                      </p>
                    </div>

                    <button
                      onClick={runStressTest}
                      disabled={benchRunning}
                      className="py-2 px-3 rounded-xl bg-[var(--action-primary)] text-[var(--core-gray-00)] button-sm font-semibold hover:bg-[var(--action-primary-hover)] active:scale-[0.98] disabled:opacity-40 transition cursor-pointer"
                    >
                      {benchRunning ? 'Running stress test...' : 'Run benchmark'}
                    </button>
                  </div>

                  {benchRunning && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between caption-4 font-mono text-[var(--text-primary)]">
                        <span>Progress</span>
                        <span>{benchProgress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--surface-base)] border border-[var(--border-primary)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--core-primary-500)] transition-all duration-200"
                          style={{ width: `${benchProgress}%` }}
                        />
                      </div>
                      <div className="caption-3 font-mono text-[var(--text-success)] font-semibold">
                        Observed throughput: {benchOpsPerSec !== null ? `${benchOpsPerSec.toLocaleString()} ops/sec` : 'Measuring...'}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ROUTE 4: DOCS & QUICKSTART */}
            {viewRoute === 'docs' && (
              <motion.div
                key="docs-route"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto px-4 md:px-8 py-12 space-y-8 w-full"
              >
                <div>
                  <h1 className="heading-3 font-semibold text-[var(--text-primary)] mb-2">Developer quickstart guide</h1>
                  <p className="body-4 text-[var(--text-tertiary)]">
                    How to initialize and run SyncMark in your local developer environment.
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-4">
                  <h2 className="title-2 text-[var(--text-primary)]">Repository cloning and setup</h2>
                  <pre className="bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-primary)] font-mono text-xs text-[var(--text-info)] overflow-x-auto leading-relaxed">
{`# Clone the repository
git clone https://github.com/RajdipGanguli/SyncMark.git
cd syncmark

# Install dependencies
npm install

# Start development server
npm run dev`}
                  </pre>
                </div>

                <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-4">
                  <h2 className="title-2 text-[var(--text-primary)]">Configuring Gemini API key</h2>
                  <p className="body-5 text-[var(--text-tertiary)]">
                    Optional: supply your Gemini API key inside .env.local (for local development via vercel dev) or Vercel environment variables to enable serverless proxy model responses.
                  </p>
                  <pre className="bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-primary)] font-mono text-xs text-[var(--text-info)] overflow-x-auto">
GEMINI_API_KEY=your_gemini_api_key_here
                  </pre>
                </div>
              </motion.div>
            )}

            {/* ROUTE 5: PRIVACY POLICY */}
            {viewRoute === 'privacy' && (
              <motion.div
                key="privacy-route"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-6 w-full"
              >
                <h1 className="heading-3 font-semibold text-[var(--text-primary)]">Local privacy policy</h1>
                <p className="body-4 text-[var(--text-tertiary)]">
                  SyncMark adheres to strict client side privacy principles:
                </p>
                <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-4 body-4 text-[var(--text-secondary)]">
                  <p>1. Documents and notes are stored strictly inside your browser IndexedDB database.</p>
                  <p>2. No tracking pixels, analytics beacons, or user tracking scripts are loaded.</p>
                  <p>3. If you invoke AI transformations, only the active document text is transmitted directly to Google Gemini APIs using your own key or heuristic fallbacks.</p>
                  <p>4. You retain total ownership of your data at all times with instant markdown export capability.</p>
                </div>
                <button
                  onClick={() => setViewRoute('home')}
                  className="py-2 px-3 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] text-[var(--text-primary)] button-sm hover:border-[var(--border-action-primary)] hover:text-[var(--text-info)] transition cursor-pointer"
                >
                  Return to overview
                </button>
              </motion.div>
            )}

            {/* ROUTE 6: TERMS OF SERVICE */}
            {viewRoute === 'terms' && (
              <motion.div
                key="terms-route"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-6 w-full"
              >
                <h1 className="heading-3 font-semibold text-[var(--text-primary)]">Terms of software usage</h1>
                <div className="rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] p-6 space-y-4 body-4 text-[var(--text-secondary)]">
                  <p>SyncMark is distributed as open developer software under the MIT license.</p>
                  <p>The software is provided as is without warranty of any kind, express or implied. Users maintain complete responsibility for backing up local IndexedDB database records.</p>
                </div>
                <button
                  onClick={() => setViewRoute('home')}
                  className="py-2 px-3 rounded-xl bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] text-[var(--text-primary)] button-sm hover:border-[var(--border-action-primary)] hover:text-[var(--text-info)] transition cursor-pointer"
                >
                  Return to overview
                </button>
              </motion.div>
            )}

            {/* ROUTE 7: BRANDED 404 STATE */}
            {viewRoute === '404' && (
              <motion.div
                key="404-route"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-xl mx-auto px-4 py-24 text-center space-y-6 w-full"
              >
                <div className="font-mono text-6xl font-semibold text-[var(--text-info)]">404</div>
                <h1 className="heading-4 font-semibold text-[var(--text-primary)]">Document or route not found</h1>
                <p className="body-4 text-[var(--text-tertiary)]">
                  The requested view does not exist in the current application registry.
                </p>
                <button
                  onClick={() => setViewRoute('home')}
                  className="py-2 px-3 rounded-xl bg-[var(--action-primary)] text-[var(--core-gray-00)] button-sm font-semibold hover:bg-[var(--action-primary-hover)] active:scale-[0.98] transition cursor-pointer"
                >
                  Return to overview
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* Footer Pinned Cleanly to Bottom (Eliminating Bottom Dead Space) */}
        <footer className="mt-auto w-full bg-[var(--surface-primary)] border-t border-[var(--border-primary)] py-8 px-4 md:px-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <SyncMarkLogo size={24} />
              <div>
                <div className="title-3 text-[var(--text-primary)]">SyncMark</div>
                <div className="caption-5 text-[var(--text-subtle)]">
                  Engineered by Rajdip Ganguli.
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap justify-center gap-4 text-xs text-[var(--text-tertiary)]">
              <button
                onClick={() => {
                  setViewRoute('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Overview
              </button>
              <button
                onClick={() => setViewRoute('features')}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Architecture
              </button>
              <button
                onClick={() => setViewRoute('benchmarks')}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Stress lab
              </button>
              <button
                onClick={() => setViewRoute('docs')}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Docs
              </button>
              <button
                onClick={() => setViewRoute('privacy')}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Privacy
              </button>
              <button
                onClick={() => setViewRoute('terms')}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Terms
              </button>
              <a
                href="https://github.com/RajdipGanguli"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--text-primary)] transition flex items-center gap-1 cursor-pointer"
              >
                GitHub <ArrowUpRight className="w-3.5 h-3.5 text-[var(--surface-accent)]" />
              </a>
            </div>
          </div>

          <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-[var(--border-primary)] text-center caption-5 text-[var(--text-subtle)]">
            © 2026 SyncMark. Local first reactive core. Zero cloud runtime dependencies.
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL INTERACTIVE STUDIO APP
  // ==========================================
  return (
    <div className="flex h-screen w-screen bg-[var(--surface-base)] text-[var(--text-primary)] font-sans antialiased overflow-hidden selection:bg-[var(--surface-secondary-subtle)] selection:text-[var(--core-primary-350)]">
      {/* Activity Navigation Sidebar */}
      <nav className="w-14 h-full bg-[var(--surface-base)] border-r border-[var(--border-primary)] flex flex-col items-center justify-between py-4 z-20 shrink-0">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setMainMode('landing')}
            className="w-9 h-9 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-primary)] flex items-center justify-center hover:border-[var(--border-action-primary)] active:scale-[0.98] transition cursor-pointer"
            title="Return to landing overview"
          >
            <SyncMarkLogo size={24} />
          </button>

          <div className="w-6 h-px bg-[var(--border-primary)] my-1" />

          <button
            onClick={() => setStudioTab('editor')}
            className={`p-2 rounded-xl transition cursor-pointer ${
              studioTab === 'editor'
                ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-md'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
            }`}
            title="Notes and documents"
          >
            <PencilSimple className="w-4 h-4" />
          </button>

          <button
            onClick={() => setStudioTab('telemetry')}
            className={`p-2 rounded-xl transition cursor-pointer ${
              studioTab === 'telemetry'
                ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-md'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
            }`}
            title="Architecture and sync telemetry"
          >
            <Pulse className="w-4 h-4" />
          </button>

          <button
            onClick={() => setStudioTab('playground')}
            className={`p-2 rounded-xl transition cursor-pointer ${
              studioTab === 'playground'
                ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-md'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
            }`}
            title="Gemini AI playground"
          >
            <Sparkle className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setStudioTab('settings')}
          className={`p-2 rounded-xl transition cursor-pointer ${
            studioTab === 'settings'
              ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] shadow-md'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
          }`}
          title="Diagnostics and settings"
        >
          <Gear className="w-4 h-4" />
        </button>
      </nav>

      {/* Document Sidebar */}
      <aside className="w-72 md:w-80 h-full bg-[var(--surface-primary)] border-r border-[var(--border-primary)] flex flex-col justify-between z-10 shrink-0">
        <div className="flex flex-col h-[calc(100%-56px)]">
          <div className="p-4 border-b border-[var(--border-primary)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="title-3 text-[var(--text-primary)]">SyncMark Studio</h1>
                <p className="caption-5 text-[var(--text-subtle)]">Local first reactive core</p>
              </div>

              <button
                onClick={handleCreateNew}
                className="py-1.5 px-3 rounded-lg bg-[var(--action-primary)] text-[var(--core-gray-00)] button-sm font-semibold hover:bg-[var(--action-primary-hover)] active:scale-[0.98] transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New doc
              </button>
            </div>

            <div className="relative">
              <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-subtle)]" />
              <input
                type="text"
                placeholder="Search local documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-base)] border border-[var(--border-primary)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-[var(--border-action-primary)] transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition cursor-pointer whitespace-nowrap ${
                    selectedTag === tag
                      ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] font-semibold'
                      : 'bg-[var(--surface-primary-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes List Feed */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scroll">
            <AnimatePresence>
              {filteredNotes.map((note) => {
                const isSelected = note.id === selectedNoteId;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setStudioTab('editor');
                    }}
                    className={`group relative p-3 rounded-xl cursor-pointer transition border ${
                      isSelected
                        ? 'bg-[var(--surface-primary-subtle)] border-[var(--border-action-primary)]'
                        : 'bg-[var(--surface-primary)] border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--surface-primary-subtle)]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium truncate flex-1 ${isSelected ? 'text-[var(--text-info)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                        {note.title || 'Untitled document'}
                      </p>

                      <div className="flex items-center gap-1.5">
                        {note.syncStatus === 'synced' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-[var(--text-success)]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-[var(--text-warning)]" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-[var(--core-red-400)] text-[var(--text-subtle)] p-0.5 rounded transition cursor-pointer"
                          title="Delete document"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="caption-5 text-[var(--text-tertiary)] truncate mt-1">
                      {note.content.replace(/#|\*|-|`/g, '').slice(0, 48) || 'Empty document...'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="caption-5 font-mono text-[var(--text-subtle)]">
                        {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {note.tags?.[0] && (
                        <span className="caption-5 font-mono px-1.5 py-0.5 rounded bg-[var(--surface-base)] text-[var(--text-info)] border border-[var(--border-primary)]">
                          {note.tags[0]}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Sync Telemetry Strip */}
        <div className="h-14 px-4 bg-[var(--surface-base)] border-t border-[var(--border-primary)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--text-success)] caption-2 font-medium">
                <WifiHigh className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[var(--core-red-400)] caption-2 font-medium">
                <WifiSlash className="w-3.5 h-3.5" /> Offline mode
              </span>
            )}
            <span className="caption-5 font-mono text-[var(--text-subtle)] hidden sm:inline">
              Local only, sync backend not connected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <span className="px-2 py-0.5 bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] text-[var(--text-warning)] rounded-full font-mono text-xs" title="Pending mutations in local IndexedDB sync queue">
                {queue.length} in queue
              </span>
            )}
            <button
              onClick={triggerSyncQueue}
              disabled={isSyncing}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-primary-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition cursor-pointer"
              title="Verify local queue state"
            >
              <ArrowClockwise className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--text-info)]' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Studio Viewport */}
      <main className="flex-1 flex flex-col h-full bg-[var(--surface-base)] relative z-10 overflow-hidden">
        {/* TAB 1: WORKSPACE EDITOR */}
        {studioTab === 'editor' && (
          <div className="flex flex-col h-full">
            <header className="h-14 px-4 md:px-8 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--surface-primary)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                <button
                  onClick={() => setMainMode('landing')}
                  className="hover:text-[var(--text-primary)] flex items-center gap-1 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-info)]" /> Landing overview
                </button>
                <span>/</span>
                <span className="text-[var(--text-primary)] font-medium truncate max-w-[180px]">{title || 'Untitled document'}</span>
                <span className="caption-5 font-mono ml-2 hidden sm:inline text-[var(--text-subtle)]">
                  {wordCount} words • {readingTime} min read
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-[var(--surface-base)] border border-[var(--border-primary)] rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      viewMode === 'edit' ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      viewMode === 'split' ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Split
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      viewMode === 'preview' ? 'bg-[var(--action-primary)] text-[var(--core-gray-00)] font-semibold' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Preview
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1 border-r border-[var(--border-primary)] pr-2">
                  <button
                    onClick={() => copyToClipboard(content)}
                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary-subtle)] transition cursor-pointer"
                    title="Copy markdown"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[var(--text-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary-subtle)] transition cursor-pointer"
                    title="Export as markdown"
                  >
                    <DownloadSimple className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDuplicateNote}
                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary-subtle)] transition cursor-pointer"
                    title="Duplicate document"
                  >
                    <ShareNetwork className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Copilot Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => triggerAI('summarize')}
                    disabled={isAiProcessing}
                    className="py-1 px-2.5 rounded-lg border border-[var(--border-action-primary)] bg-[var(--surface-primary-subtle)] hover:bg-[var(--action-primary)] text-[var(--text-info)] hover:text-[var(--core-gray-00)] button-sm transition active:scale-[0.98] disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <Sparkle className="w-3.5 h-3.5" /> Summarize
                  </button>

                  <button
                    onClick={() => triggerAI('actionItems')}
                    disabled={isAiProcessing}
                    className="py-1 px-2.5 rounded-lg border border-[var(--border-action-primary)] bg-[var(--surface-primary-subtle)] hover:bg-[var(--action-primary)] text-[var(--text-info)] hover:text-[var(--core-gray-00)] button-sm transition active:scale-[0.98] disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Tasks
                  </button>
                </div>
              </div>
            </header>

            {selectedNoteId ? (
              <div className="flex-1 flex flex-col h-[calc(100%-56px)] px-4 md:px-10 py-6 max-w-6xl w-full mx-auto overflow-hidden">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleAutoSave(e.target.value, content)}
                  placeholder="Document title"
                  className="w-full bg-transparent heading-5 font-semibold tracking-tight outline-none placeholder-[var(--text-subtle)] text-[var(--text-primary)] mb-4 border-b border-[var(--border-primary)] pb-3"
                />

                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                  {(viewMode === 'split' || viewMode === 'edit') && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="caption-5 font-mono text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                        <PencilSimple className="w-3 h-3 text-[var(--text-info)]" /> Raw markdown editor
                      </div>
                      <textarea
                        value={content}
                        onChange={(e) => handleAutoSave(title, e.target.value)}
                        placeholder="Write markdown here... Writes persist directly to reactive IndexedDB storage."
                        className="flex-1 w-full bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-4 resize-none outline-none leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-subtle)] font-mono text-xs custom-scroll focus:border-[var(--border-action-primary)] transition"
                      />
                    </div>
                  )}

                  {(viewMode === 'split' || viewMode === 'preview') && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      <div className="caption-5 font-mono text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-[var(--surface-accent)]" /> Live rendered preview
                      </div>
                      <div className="flex-1 h-full overflow-y-auto bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-5 custom-scroll text-xs leading-relaxed text-[var(--text-primary)]">
                        <MarkdownRenderer content={content} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] space-y-3">
                <FolderOpen className="w-10 h-10 text-[var(--text-info)] stroke-[1.2]" />
                <p className="body-4">Select an existing document from the sidebar or click New doc.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ARCHITECTURE & TELEMETRY */}
        {studioTab === 'telemetry' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full custom-scroll space-y-8">
            <div>
              <h2 className="heading-5 font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2.5">
                <Pulse className="w-5 h-5 text-[var(--text-info)]" /> Distributed architecture and sync telemetry
              </h2>
              <p className="body-4 text-[var(--text-tertiary)]">
                Live metrics monitoring client mutations, synchronization queue latency, and LWW resolution metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 space-y-1">
                <div className="flex items-center justify-between text-[var(--text-tertiary)] caption-4">
                  <span>Total notes</span>
                  <Database className="w-4 h-4 text-[var(--surface-accent)]" />
                </div>
                <div className="font-mono text-3xl font-semibold text-[var(--text-primary)]">{notes.length}</div>
                <div className="caption-5 text-[var(--text-success)] font-medium">Persisted in IndexedDB</div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 space-y-1">
                <div className="flex items-center justify-between text-[var(--text-tertiary)] caption-4">
                  <span>Pending FIFO queue</span>
                  <Clock className="w-4 h-4 text-[var(--text-warning)]" />
                </div>
                <div className="font-mono text-3xl font-semibold text-[var(--text-warning)]">{queue.length}</div>
                <div className="caption-5 text-[var(--text-subtle)]">Mutations awaiting commit</div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 space-y-1">
                <div className="flex items-center justify-between text-[var(--text-tertiary)] caption-4">
                  <span>Network status</span>
                  <WifiHigh className="w-4 h-4 text-[var(--text-success)]" />
                </div>
                <div className={`font-mono text-3xl font-semibold ${isOnline ? 'text-[var(--text-success)]' : 'text-[var(--core-red-400)]'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div className="caption-5 text-[var(--text-subtle)]">Last write wins active</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] space-y-4">
              <h3 className="title-2 text-[var(--text-primary)] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--text-info)]" /> Consensus and conflict settlement model
              </h3>
              <p className="body-4 text-[var(--text-tertiary)]">
                SyncMark operates with client authority and a persistent FIFO queue in IndexedDB. Currently in local-first mode (sync backend not connected). In a connected multi-client setup, local queue entries reconcile with monotonic timestamps.
              </p>
              <div className="bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-primary)] font-mono text-xs text-[var(--text-info)] space-y-1 overflow-x-auto">
                <div>1. if (client.timestamp &gt; remote.timestamp) &#123; settle(REMOTE = client.payload) &#125;</div>
                <div>2. else &#123; settle(LOCAL = remote.payload) &#125;</div>
                <div>3. queue.drain(item.id)</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GEMINI PLAYGROUND */}
        {studioTab === 'playground' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full custom-scroll space-y-6">
            <div>
              <h2 className="heading-5 font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2.5">
                <Sparkle className="w-5 h-5 text-[var(--core-accent-500)]" /> Gemini prompt lab
              </h2>
              <p className="body-4 text-[var(--text-tertiary)]">
                Execute cognitive transformations directly on your active document using Gemini flash models.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => triggerAI('summarize')}
                className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="title-2 text-[var(--text-info)] font-semibold">Executive summarizer</h3>
                  <ArrowUpRight className="w-4 h-4 text-[var(--surface-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </div>
                <p className="body-5 text-[var(--text-tertiary)]">Condenses long architectural or technical documentation into key takeaways.</p>
              </div>

              <div
                onClick={() => triggerAI('actionItems')}
                className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="title-2 text-[var(--text-success)] font-semibold">Action item extraction</h3>
                  <ArrowUpRight className="w-4 h-4 text-[var(--surface-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </div>
                <p className="body-5 text-[var(--text-tertiary)]">Parses paragraphs and lists to extract markdown checklists automatically.</p>
              </div>

              <div
                onClick={() => triggerAI('polish')}
                className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="title-2 text-[var(--core-primary-350)] font-semibold">Tone polish and clarity</h3>
                  <ArrowUpRight className="w-4 h-4 text-[var(--surface-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </div>
                <p className="body-5 text-[var(--text-tertiary)]">Upgrades phrasing, removes redundancy, and polishes engineering terminology.</p>
              </div>

              <div
                onClick={() => triggerAI('expand')}
                className="p-5 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] transition-colors duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="title-2 text-[var(--core-accent-200)] font-semibold">Technical expansion</h3>
                  <ArrowUpRight className="w-4 h-4 text-[var(--surface-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </div>
                <p className="body-5 text-[var(--text-tertiary)]">Adds edge cases, architectural patterns, and implementation checklists.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & STORAGE RESET */}
        {studioTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto w-full custom-scroll space-y-6">
            <div>
              <h2 className="heading-5 font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2.5">
                <Gear className="w-5 h-5 text-[var(--text-info)]" /> Workspace settings and storage
              </h2>
              <p className="body-4 text-[var(--text-tertiary)]">
                Inspect local database persistence, flush queue buffers, and reset seed documents.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] space-y-4">
              <h3 className="title-2 text-[var(--text-primary)]">Database control and reset</h3>
              <p className="body-5 text-[var(--text-tertiary)]">Re seed the initial architectural documents if you deleted them.</p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={async () => {
                    await db.notes.clear();
                    await db.syncQueue.clear();
                    await db.notes.bulkPut(SHOWCASE_SEEDS);
                    setSelectedNoteId(SHOWCASE_SEEDS[0].id);
                    currentSelectedIdRef.current = SHOWCASE_SEEDS[0].id;
                    setTitle(SHOWCASE_SEEDS[0].title);
                    setContent(SHOWCASE_SEEDS[0].content);
                    alert('Showcase documents seeded successfully!');
                  }}
                  className="py-2 px-3 bg-[var(--action-primary)] text-[var(--core-gray-00)] button-sm font-semibold rounded-lg hover:bg-[var(--action-primary-hover)] active:scale-[0.98] transition cursor-pointer"
                >
                  Reload showcase docs
                </button>

                <button
                  onClick={async () => {
                    await db.notes.clear();
                    await db.syncQueue.clear();
                    setSelectedNoteId('');
                    currentSelectedIdRef.current = null;
                    setTitle('');
                    setContent('');
                  }}
                  className="py-2 px-3 bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] text-[var(--core-red-400)] button-sm font-medium rounded-lg hover:border-[var(--core-red-400)] active:scale-[0.98] transition cursor-pointer"
                >
                  Purge local database
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Copilot Result Modal */}
      <AnimatePresence>
        {aiResultModal && (
          <div className="fixed inset-0 z-50 bg-[var(--overlay-xlg)] backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-primary)] pb-3">
                <div className="flex items-center gap-2 text-[var(--text-primary)] title-2">
                  <Sparkle className="w-4 h-4 text-[var(--text-info)]" /> {aiResultModal.title}
                </div>
                <button
                  onClick={() => setAiResultModal(null)}
                  className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] text-xs px-2 py-1 rounded cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <div className="text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scroll bg-[var(--surface-base)] p-4 rounded-xl border border-[var(--border-primary)]">
                {aiResultModal.body}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => copyToClipboard(aiResultModal.body)}
                  className="py-1.5 px-3 bg-[var(--surface-primary-subtle)] border border-[var(--border-primary)] hover:border-[var(--border-action-primary)] text-[var(--text-primary)] button-sm rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[var(--text-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy output'}
                </button>
                <button
                  onClick={() => {
                    handleAutoSave(title, `${content}\n\n## ${aiResultModal.title}\n${aiResultModal.body}`);
                    setAiResultModal(null);
                  }}
                  className="py-1.5 px-3 bg-[var(--action-primary)] text-[var(--core-gray-00)] button-sm font-semibold rounded-lg hover:bg-[var(--action-primary-hover)] active:scale-[0.98] transition cursor-pointer"
                >
                  Append to document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

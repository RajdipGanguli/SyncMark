import Dexie, { type Table } from 'dexie';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deleted?: boolean;
}

export interface SyncQueueItem {
  queueId?: number;
  noteId: string;
  action: 'UPSERT' | 'DELETE';
  payload: Note;
  createdAt: number;
}

export class SyncMarkDatabase extends Dexie {
  notes!: Table<Note, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('SyncMarkLocalDB');
    this.version(1).stores({
      notes: 'id, title, updatedAt, syncStatus, deleted',
      syncQueue: '++queueId, noteId, action, createdAt',
    });
  }
}

export const db = new SyncMarkDatabase();

export const SHOWCASE_SEEDS: Note[] = [
  {
    id: 'seed-architecture-spec',
    title: 'SyncMark Distributed Architecture Spec',
    tags: ['Architecture', 'PWA', 'Distributed Systems'],
    updatedAt: Date.now() - 1000 * 60 * 30,
    syncStatus: 'synced',
    deleted: false,
    content: `# SyncMark Architecture Specification

SyncMark is an offline capable progressive web application utilizing a local first reactive storage layer combined with a background synchronization engine.

### Core Highlights
- Zero latency writes: All mutations commit directly to browser IndexedDB with instantaneous response.
- Resilient sync engine: Network partitions push modifications to a FIFO queue buffer.
- Conflict settlement: Automatic last write wins deterministic timestamp resolution.
- Model acceleration: Serverless proxy orchestration using Gemini models.

---

### Synchronization Pipeline
- [x] Client commits to non blocking local storage
- [x] Background worker registers network lifecycle
- [ ] Multi region WebSocket reconciliation
- [x] Deterministic timestamp resolution without remote locks`
  },
  {
    id: 'seed-sprint-checklist',
    title: 'Engineering Sprint Checklist',
    tags: ['Sprint', 'Tasks', 'Deliverables'],
    updatedAt: Date.now() - 1000 * 60 * 120,
    syncStatus: 'synced',
    deleted: false,
    content: `# Engineering Sprint Tasks

Track primary engineering deliverables. Use the Copilot action items button to parse tasks into markdown format.

- [x] Configure IndexedDB schemas for notes and syncQueue
- [x] Implement Workbox Service Worker caching strategies
- [ ] Add bi directional WebSocket syncing for collaborative workflows
- [ ] Implement CRDT delta reconciliation for character level edits
- [x] Integrate Gemini copilot for document summarization
- [ ] Benchmark Lighthouse PWA metrics on throttled networks`
  },
  {
    id: 'seed-frontend-guide',
    title: 'Frontend Performance Optimization Guide',
    tags: ['Frontend', 'Performance', 'React 19'],
    updatedAt: Date.now() - 1000 * 60 * 360,
    syncStatus: 'synced',
    deleted: false,
    content: `# Frontend Optimization Guide

### Core Web Vitals Targets
- Largest Contentful Paint: under 2.5s
- Interaction to Next Paint: under 200ms
- Cumulative Layout Shift: under 0.1

### Key Engineering Decisions
- [x] Hardware accelerated backdrops without blur penalties
- [x] Responsive vector SVG logo integration
- [x] Progressive web app offline caching with Workbox runtime interceptors`
  }
];

export async function initDbMigration(): Promise<void> {
  try {
    const count = await db.notes.count();
    if (count === 0) {
      let initialNotes: Note[] = [];
      try {
        const saved = localStorage.getItem('syncmark_notes');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialNotes = parsed;
          }
        }
      } catch {
        initialNotes = [];
      }

      if (!initialNotes || initialNotes.length === 0) {
        initialNotes = SHOWCASE_SEEDS;
      }

      await db.notes.bulkPut(initialNotes);

      try {
        localStorage.removeItem('syncmark_notes');
        localStorage.removeItem('syncmark_queue');
      } catch {
        // Ignore localStorage cleanup errors
      }
    }
  } catch (err) {
    console.error('Dexie migration failed:', err);
  }
}

import { db, type Note, type SyncQueueItem } from '../db';

type SyncListener = (syncing: boolean) => void;

class SyncEngine {
  private isSyncing = false;
  private listeners: SyncListener[] = [];
  private writeSamples: number[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.sync();
      });
    }
  }

  public subscribe(fn: SyncListener): () => void {
    this.listeners.push(fn);
    fn(this.isSyncing);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(syncing: boolean) {
    this.isSyncing = syncing;
    for (const fn of this.listeners) {
      fn(syncing);
    }
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public recordWriteSample(durationMs: number) {
    this.writeSamples.push(durationMs);
    if (this.writeSamples.length > 50) {
      this.writeSamples.shift();
    }
  }

  public medianWriteMs(): number | null {
    if (this.writeSamples.length === 0) return null;
    const sorted = [...this.writeSamples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  public getWriteSamples(): number[] {
    return [...this.writeSamples];
  }

  public async saveNoteLocally(note: Note): Promise<Note> {
    const t0 = performance.now();
    const noteRecord: Note = {
      ...note,
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deleted: false,
    };

    // Single Dexie transaction over notes + syncQueue
    await db.transaction('rw', [db.notes, db.syncQueue], async () => {
      await db.notes.put(noteRecord);
      // Replace existing queue entry for this noteId (one queue row per note)
      await db.syncQueue.where('noteId').equals(noteRecord.id).delete();
      await db.syncQueue.add({
        noteId: noteRecord.id,
        action: 'UPSERT',
        payload: noteRecord,
        createdAt: Date.now(),
      });
    });

    const duration = performance.now() - t0;
    this.recordWriteSample(duration);

    return noteRecord;
  }

  public async createNote(partial?: Partial<Note>): Promise<Note> {
    const newNote: Note = {
      id: partial?.id || crypto.randomUUID(),
      title: partial?.title ?? 'Untitled document',
      content: partial?.content ?? '# New note\n\nStart writing in zero latency local markdown...',
      tags: partial?.tags ?? ['General'],
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deleted: false,
    };
    return this.saveNoteLocally(newNote);
  }

  public async deleteNoteLocally(noteId: string): Promise<void> {
    const t0 = performance.now();
    await db.transaction('rw', [db.notes, db.syncQueue], async () => {
      const existing = await db.notes.get(noteId);
      if (!existing) return;
      const tombstone: Note = {
        ...existing,
        deleted: true,
        syncStatus: 'pending',
        updatedAt: Date.now(),
      };
      await db.notes.put(tombstone);
      await db.syncQueue.where('noteId').equals(noteId).delete();
      await db.syncQueue.add({
        noteId,
        action: 'DELETE',
        payload: tombstone,
        createdAt: Date.now(),
      });
    });

    const duration = performance.now() - t0;
    this.recordWriteSample(duration);
  }

  public async duplicateNote(sourceNote: Note): Promise<Note> {
    const duplicated: Note = {
      ...sourceNote,
      id: crypto.randomUUID(),
      title: `${sourceNote.title} (Copy)`,
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deleted: false,
    };
    return this.saveNoteLocally(duplicated);
  }

  /**
   * Clearly documented stub: Sync backend is not yet connected.
   * In a complete multi-tier setup, this would drain the persistent FIFO queue
   * to a cloud endpoint. Currently, SyncMark operates entirely in local-first mode.
   */
  public async sync(): Promise<void> {
    if (this.isSyncing) return;
    this.notify(true);
    try {
      // Local stub delay simulating async queue review
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.error('Local sync verification error:', err);
    } finally {
      this.notify(false);
    }
  }

  /**
   * Real benchmark test: executes actual Dexie transactions and reports true ops/sec and latency.
   */
  public async runRealBenchmark(
    sampleSize = 250,
    onProgress?: (progress: number) => void
  ): Promise<{ opsPerSec: number; avgLatencyMs: number; totalDurationMs: number }> {
    const benchmarkIds: string[] = [];
    const testNotes: Note[] = Array.from({ length: sampleSize }, (_, i) => {
      const id = `bench-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
      benchmarkIds.push(id);
      return {
        id,
        title: `Benchmark Transaction ${i + 1}`,
        content: `# Benchmark Transaction ${i + 1}\nTesting Dexie local transaction throughput.`,
        tags: ['Benchmark'],
        updatedAt: Date.now(),
        syncStatus: 'pending',
        deleted: false,
      };
    });

    const t0 = performance.now();
    for (let i = 0; i < testNotes.length; i++) {
      await db.transaction('rw', [db.notes, db.syncQueue], async () => {
        await db.notes.put(testNotes[i]);
        await db.syncQueue.where('noteId').equals(testNotes[i].id).delete();
        await db.syncQueue.add({
          noteId: testNotes[i].id,
          action: 'UPSERT',
          payload: testNotes[i],
          createdAt: Date.now(),
        });
      });
      if (onProgress && i % 25 === 0) {
        onProgress(Math.round(((i + 1) / sampleSize) * 100));
      }
    }
    const totalDurationMs = performance.now() - t0;
    const avgLatencyMs = totalDurationMs / sampleSize;
    const opsPerSec = Math.round(sampleSize / (totalDurationMs / 1000));

    this.recordWriteSample(avgLatencyMs);

    // Clean up all benchmark entries from Dexie
    await db.transaction('rw', [db.notes, db.syncQueue], async () => {
      for (const id of benchmarkIds) {
        await db.notes.delete(id);
        await db.syncQueue.where('noteId').equals(id).delete();
      }
    });

    if (onProgress) {
      onProgress(100);
    }

    return { opsPerSec, avgLatencyMs, totalDurationMs };
  }
}

export const syncEngine = new SyncEngine();

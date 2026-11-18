import { db, type Note, type SyncQueueItem } from '../db';

type SyncListener = (syncing: boolean) => void;

class SyncEngine {
  private isSyncing = false;
  private listeners: SyncListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
    }
  }

  public subscribe(fn: SyncListener) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(syncing: boolean) {
    this.isSyncing = syncing;
    this.listeners.forEach((fn) => fn(syncing));
  }

  public async saveNoteLocally(title: string, content: string, existingNote?: Note): Promise<Note> {
    const id = existingNote?.id || crypto.randomUUID();
    const noteRecord: Note = {
      id,
      title: title || 'Untitled Document',
      content,
      tags: existingNote?.tags || ['General'],
      updatedAt: Date.now(),
      syncStatus: 'pending',
      deleted: false,
    };

    // Commit to IndexedDB
    await db.notes.put(noteRecord);

    // Enqueue
    await db.syncQueue.add({
      noteId: id,
      action: 'UPSERT',
      payload: noteRecord,
      createdAt: Date.now(),
    });

    if (navigator.onLine) {
      // Debounce sync slightly
      setTimeout(() => this.sync(), 400);
    }

    return noteRecord;
  }

  public async deleteNoteLocally(noteId: string): Promise<void> {
    const note = await db.notes.get(noteId);
    if (!note) return;

    await db.notes.update(noteId, { deleted: true, syncStatus: 'pending' });

    await db.syncQueue.add({
      noteId,
      action: 'DELETE',
      payload: note,
      createdAt: Date.now(),
    });

    if (navigator.onLine) {
      setTimeout(() => this.sync(), 400);
    }
  }

  public async sync(): Promise<void> {
    if (!navigator.onLine || this.isSyncing) return;
    this.notify(true);

    try {
      const queue: SyncQueueItem[] = await db.syncQueue.orderBy('createdAt').toArray();

      for (const item of queue) {
        // Simulate remote network latency (30ms)
        await new Promise((r) => setTimeout(r, 30));

        if (item.action === 'DELETE') {
          await db.notes.delete(item.noteId);
        } else {
          // Last-Write-Wins settlement
          await db.notes.update(item.noteId, { syncStatus: 'synced' });
        }

        if (item.queueId) {
          await db.syncQueue.delete(item.queueId);
        }
      }
    } catch (err) {
      console.error('Sync issue:', err);
    } finally {
      this.notify(false);
    }
  }
}

export const syncEngine = new SyncEngine();
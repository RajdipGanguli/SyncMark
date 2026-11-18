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
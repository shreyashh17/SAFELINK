/**
 * localStore.ts
 *
 * A simple JSON-file-backed data store that acts as a fallback
 * when Firebase credentials are not yet configured.
 *
 * Data is persisted to .data/ folder next to the backend source.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../.data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readCollection<T>(name: string): Record<string, T> {
    const file = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        return {};
    }
}

function writeCollection<T>(name: string, data: Record<string, T>): void {
    const file = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// Generic CRUD helpers
export const localStore = {
    /** Insert or update a document */
    set<T extends object>(collection: string, id: string, doc: T): void {
        const col = readCollection<T>(collection);
        col[id] = { ...doc, _id: id };
        writeCollection(collection, col);
    },

    /** Get a document by id */
    get<T>(collection: string, id: string): (T & { _id: string }) | null {
        const col = readCollection<T>(collection);
        return (col[id] as any) ?? null;
    },

    /** Query documents by a single field value */
    where<T>(collection: string, field: keyof T, value: any): (T & { _id: string })[] {
        const col = readCollection<T>(collection);
        return Object.values(col).filter((doc: any) => doc[field] === value) as any[];
    },

    /** Get all documents in a collection, sorted by a field descending */
    getAll<T>(collection: string, sortField?: keyof T): (T & { _id: string })[] {
        const col = readCollection<T>(collection);
        const docs = Object.values(col) as any[];
        if (sortField) {
            docs.sort((a, b) => (b[sortField] ?? '') > (a[sortField] ?? '') ? 1 : -1);
        }
        return docs;
    },

    /** Update fields of a document */
    update<T>(collection: string, id: string, patch: Partial<T>): void {
        const col = readCollection<T>(collection);
        if (col[id]) col[id] = { ...col[id], ...patch };
        writeCollection(collection, col);
    },

    /** Generate a random ID */
    newId(): string {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    },
};

export default localStore;

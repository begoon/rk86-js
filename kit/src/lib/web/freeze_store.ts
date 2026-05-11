export type Freeze = {
    id: string;
    createdAt: number;
    fileName: string;
    thumbnail: string;
    snapshot: string;
};

const DB_NAME = "rk86";
const DB_VERSION = 1;
const STORE = "freezes";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: "id" });
                store.createIndex("createdAt", "createdAt");
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
    return openDB().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const transaction = db.transaction(STORE, mode);
                const store = transaction.objectStore(STORE);
                const result = fn(store);
                if (result instanceof Promise) {
                    result.then(resolve, reject);
                } else {
                    result.onsuccess = () => resolve(result.result);
                    result.onerror = () => reject(result.error);
                }
                transaction.oncomplete = () => db.close();
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error);
                };
            }),
    );
}

export async function loadFreezes(): Promise<Freeze[]> {
    if (typeof indexedDB === "undefined") return [];
    try {
        const all = await tx<Freeze[]>("readonly", (store) => store.getAll() as IDBRequest<Freeze[]>);
        return all.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
        return [];
    }
}

export async function saveFreeze(freeze: Freeze): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    try {
        await tx("readwrite", (store) => store.put(freeze));
    } catch {
        // Quota or other error — ignore so the in-memory state still works.
    }
}

export async function deleteFreezeFromStore(id: string): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    try {
        await tx("readwrite", (store) => store.delete(id));
    } catch {}
}

export async function trimFreezes(cap: number): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    try {
        const all = await loadFreezes();
        const stale = all.slice(cap);
        for (const f of stale) await deleteFreezeFromStore(f.id);
    } catch {}
}

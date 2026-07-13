// Minimal IndexedDB wrapper. Cards (including uploaded images as data URLs)
// persist locally in the browser.
const DB = (() => {
  const NAME = 'cinephile-cards';
  const STORE = 'cards';
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function withStore(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    async getAll() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    },
    put(card)      { return withStore('readwrite', s => s.put(card)); },
    putMany(cards) { return withStore('readwrite', s => cards.forEach(c => s.put(c))); },
    remove(id)     { return withStore('readwrite', s => s.delete(id)); },
  };
})();

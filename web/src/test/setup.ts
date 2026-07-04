/**
 * Vitest setup: patches localStorage for happy-dom compatibility.
 *
 * happy-dom v15 exposes localStorage as a Proxy-based Storage whose methods
 * are not accessible across the VM boundary vitest uses for workers. This
 * lightweight shim provides the subset of the Storage API that the client
 * tests rely on: setItem / getItem / removeItem / clear / length.
 */
const store: Record<string, string> = {};

const localStorageMock: Storage = {
  get length() {
    return Object.keys(store).length;
  },
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null;
  },
  setItem(key: string, value: string): void {
    store[key] = String(value);
  },
  removeItem(key: string): void {
    delete store[key];
  },
  clear(): void {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  },
  key(index: number): string | null {
    return Object.keys(store)[index] ?? null;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

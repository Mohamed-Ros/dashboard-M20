// Public store URL used by "View store" / "Preview store" links.
// Override per environment with VITE_STORE_URL; in local dev it points at the Vite store dev server.
export const STORE_URL =
  import.meta.env.VITE_STORE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173' : 'https://m20fragrance.store');

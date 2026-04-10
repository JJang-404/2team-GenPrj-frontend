export function getRemoteApiBase() {
  if (import.meta.env.DEV) {
    return '/addhelper';
  }

  return import.meta.env.VITE_REMOTE_API_BASE || 'https://gen-proj.duckdns.org/addhelper';
}

// Minimal hash router: no dependency, works when opened from any static server.

import { useEffect, useState } from 'react';

function parse() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function useHashLocation() {
  const [loc, setLoc] = useState(parse);
  useEffect(() => {
    const on = () => setLoc(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return loc;
}

export function navigate(to) {
  window.location.hash = `#${to}`;
}

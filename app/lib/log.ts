// Light wrapper so call sites stay tidy. In a normal browser console.* is full,
// but keeping the helper means we can swap to a real telemetry backend later
// (e.g. Vercel Analytics, Datadog browser RUM) without touching call sites.

export function log(label: string, data?: unknown) {
  if (typeof console === 'undefined') return;
  if (data === undefined) console.log('[심사숙고]', label);
  else console.log('[심사숙고]', label, data);
}

export function logError(label: string, err: unknown) {
  if (typeof console === 'undefined') return;
  (console.error || console.log)('[심사숙고]', label, err);
}

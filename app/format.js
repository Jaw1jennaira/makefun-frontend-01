// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', '0.50' or 250) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Whether a bounty still takes entries: by its deadline, not its status alone. */
export function takesEntries(bounty) {
  return new Date(bounty.deadline).getTime() > Date.now();
}

/** A micro-unit rate (e.g. 950587) as a percent with one decimal. */
export function pct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(1)}%`;
}

/** A plain integer with thousands separators. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

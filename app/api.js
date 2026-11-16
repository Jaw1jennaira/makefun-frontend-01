// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory for 60 seconds and revalidated with
// If-None-Match afterwards: the API's ETags are bound to the minute, so a
// revalidation inside the same minute answers 304 and costs no quota.
// One view makes one request (two at most: a bounty page that also shows its
// leaderboard fetches the leaderboard only when that tab opens).

const API = 'https://make.fun/api';
const TTL_MS = 60_000;

/** path -> { etag, data, at } */
const cache = new Map();

/** How many API requests this session made, and how many were served from cache. */
export const apiStats = { requests: 0, cached: 0, revalidated: 0 };

function cacheLine(path) {
  const hit = cache.get(path);
  if (!hit) return null;
  if (Date.now() - hit.at < TTL_MS) {
    apiStats.cached += 1;
    return hit.data;
  }
  return hit; // stale: revalidate below
}

async function get(path) {
  const stale = cacheLine(path);
  if (stale && stale.data !== undefined && Date.now() - stale.at < TTL_MS) return stale.data;

  const headers = { Accept: 'application/json' };
  if (stale && stale.etag) headers['If-None-Match'] = stale.etag;
  apiStats.requests += 1;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && stale) {
    apiStats.revalidated += 1;
    stale.at = Date.now();
    return stale.data;
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  cache.set(path, { etag: res.headers.get('ETag'), data, at: Date.now() });
  return data;
}

/** The open bounties, with their times (reward, fee, deadline, entries). */
export const getBounties = () => get('/competitions?status=open&activity=times&limit=100');

/** One bounty, by its slug: summary, description, rules, rewards, entries. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard entries, ranked by the judge win rate. */
export const getLeaderboard = (slug, view = 'performance') =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard?view=${encodeURIComponent(view)}`);

/** An account's public profile, with its record and its entries. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** An avatar or entry image the API points at, resolved to an absolute URL.
 *  The API answers root-relative paths (e.g. /api/avatars/….webp), which
 *  live under https://make.fun — not under the /api base this file fetches. */
export function imageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://make.fun${url.startsWith('/') ? url : `/${url}`}`;
}

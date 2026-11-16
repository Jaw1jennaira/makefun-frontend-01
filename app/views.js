// The four surfaces, each a function from API data to HTML.
// Images the API points at get crossorigin="anonymous" before src, because
// make.fun serves its avatars and entry images with
// Cross-Origin-Resource-Policy: same-origin.

import { date, esc, money, num, pct, takesEntries, timeLeft } from './format.js';
import { imageUrl } from './api.js';
import { markdown } from './md.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** Open, closing soon (under 24h), or ended — by deadline, not status alone. */
export function statusChip(b) {
  if (!takesEntries(b)) return '<span class="chip ended">Ended</span>';
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms < 86400000) return '<span class="chip soon">Closing soon</span>';
  return '<span class="chip open">Open</span>';
}

function timeCell(b) {
  const ended = !takesEntries(b);
  const cls = ended ? 'time ended' : new Date(b.deadline).getTime() - Date.now() < 86400000 ? 'time soon' : 'time';
  return `<span class="${cls}" data-countdown="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>`;
}

/* ------------------------------------------------------------------ board */

export function boardView(data) {
  return `
    <h1>Open bounties</h1>
    <p class="lede">Live bounties on make.fun — agents and people build, enter, and get ranked in the open. Every pot below is live: the prize plus the entry fees paid in so far.</p>
    <div class="toolbar">
      <input type="search" id="board-search" placeholder="Search bounties…" aria-label="Search bounties">
      <select id="board-sort" aria-label="Sort bounties">
        <option value="pot">Biggest pot first</option>
        <option value="deadline">Ending soonest</option>
        <option value="entries">Most entries</option>
        <option value="title">Title A–Z</option>
      </select>
      <span class="count" id="board-count"></span>
    </div>
    <ul class="cards" id="board-list"></ul>
    <p class="cache-note" id="board-note"></p>`;
}

export function boardRows(items) {
  if (!items.length) return '<li class="empty">No bounties match that search.</li>';
  return items
    .map(
      (b) => `
      <li class="card">
        <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
        <p class="summary">${esc(b.summary || b.description || '')}</p>
        <div class="facts">
          <span class="pot">${pot(b)}</span>
          ${b.entryFeeUsd ? `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>` : '<span class="fee">Free to enter</span>'}
          ${timeCell(b)}
          <span class="entries">${num(b.submissionCount)} ${Number(b.submissionCount) === 1 ? 'entry' : 'entries'}</span>
          ${statusChip(b)}
        </div>
        <div class="tags">
          ${b.category ? `<span class="chip cat">${esc(b.category)}</span>` : ''}
          ${(b.skills || []).slice(0, 4).map((s) => `<span class="chip cat">${esc(s)}</span>`).join('')}
        </div>
      </li>`,
    )
    .join('');
}

/* ------------------------------------------------------------- bounty page */

function rewardsTable(b) {
  const rows = (b.rewardsNow || []).map(
    (r) => `
      <tr>
        <td class="rank">#${num(r.place)}</td>
        <td class="num">${money(r.baseUsd)}</td>
        <td class="num">${money(r.feeShareUsd)}</td>
        <td class="num"><strong>${money(r.amountUsd)}</strong></td>
      </tr>`,
  );
  if (!rows.length) return '<p class="muted">No reward breakdown published yet.</p>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Place</th><th class="num">Prize</th><th class="num">Fee share</th><th class="num">Total now</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>
    <p class="small">The live pot is ${pot(b)} — the ${money(b.rewardAmount)} prize plus ${money(b.entryFeesUsd || 0)} in entry fees from ${num(b.entryFeePayers)} payers. Totals grow as more entries pay in.</p>`;
}

function latestEntries(b) {
  const subs = (b.submissions || []).slice().sort((a, c) => new Date(c.createdAt) - new Date(a.createdAt)).slice(0, 8);
  if (!subs.length) return '';
  return `
    <h2>Latest entries</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Entry</th><th>By</th><th>Status</th><th class="num">Entered</th></tr></thead>
      <tbody>
        ${subs.map((s) => `
          <tr>
            <td>${esc(s.title || 'Untitled entry')}</td>
            <td><a class="handle-link" href="#/u/${encodeURIComponent(s.hunter)}">@${esc(s.hunter)}</a></td>
            <td>${esc(s.status || '—')}</td>
            <td class="num">${date(s.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

export function bountyView(b) {
  const open = takesEntries(b);
  return `
    <p class="crumb"><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary || '')}</p>
    <p>${statusChip(b)} ${b.category ? `<span class="chip cat">${esc(b.category)}</span>` : ''}
       ${b.sponsor?.name ? `<span class="chip cat">by ${esc(b.sponsor.name)}</span>` : ''}</p>
    <div class="stats">
      <div class="stat"><b class="pot">${pot(b)}</b><span>Live pot</span></div>
      <div class="stat"><b>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</b><span>Entry fee</span></div>
      <div class="stat"><b data-countdown="${esc(b.deadline)}">${timeLeft(b.deadline)}</b><span>${open ? 'Time left' : 'Closed'}</span></div>
      <div class="stat"><b>${num(b.submissionCount)}</b><span>Entries</span></div>
    </div>
    <div class="tabs" role="navigation" aria-label="Bounty sections">
      <a href="#/bounty/${encodeURIComponent(b.slug)}" class="active">Overview</a>
      <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a>
      <a href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">View on make.fun ↗</a>
    </div>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <h2>Dates</h2>
    <p>Opened ${date(b.publishedAt || b.opensAt)} · Deadline ${date(b.deadline)} (${timeLeft(b.deadline)})</p>
    ${b.description ? `<h2>Description</h2><div class="markdown">${markdown(b.description)}</div>` : ''}
    ${b.rules ? `<h2>Rules</h2><div class="markdown">${markdown(b.rules)}</div>` : ''}
    ${latestEntries(b)}`;
}

/* -------------------------------------------------------------- leaderboard */

const PAGE_SIZE = 25;

function entryCell(e) {
  const img = e.image
    ? `<img class="avatar" crossorigin="anonymous" src="${esc(imageUrl(e.image))}" alt="" loading="lazy">`
    : '<span class="avatar" aria-hidden="true"></span>';
  return `
    <div class="entry-cell">
      ${img}
      <div>
        <span class="entry-title">${esc(e.title || 'Untitled entry')}</span>
        <a class="handle-link" href="#/u/${encodeURIComponent(e.handle)}">@${esc(e.handle)}</a>
        ${e.house ? '<span class="chip cat">house</span>' : ''}
        ${e.baseline ? '<span class="chip cat">baseline</span>' : ''}
      </div>
    </div>`;
}

function columnCell(col, e) {
  const key = col.key;
  const shown = e.display?.[key] ?? e.values?.[key];
  if (key === 'judge') {
    const low = e.display?.judge_low ?? e.values?.judge_low;
    const high = e.display?.judge_high ?? e.values?.judge_high;
    const interval = low != null && high != null ? `<span class="sub">90% ${pct(low)} – ${pct(high)}</span>` : '';
    return `<td class="num"><span class="winrate">${pct(e.values?.judge)}</span>${interval}</td>`;
  }
  if (key === 'judge_low' || key === 'judge_high') return `<td class="num">${pct(shown)}</td>`;
  if (key === 'bytes') return `<td class="num">${num(shown)}<span class="sub">dossier bytes</span></td>`;
  if (key === 'valid') return `<td class="num">${shown === '1' || shown === 1 ? '✓ valid' : '—'}</td>`;
  return `<td class="num">${esc(shown ?? '—')}</td>`;
}

export function leaderboardView(data, slug, page, view) {
  const entries = data.entries || [];
  const columns = (data.columns || []).filter((c) => !c.hidden);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rankKey = data.rank_key || 'judge';
  const comp = data.competition || {};

  return `
    <p class="crumb"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(comp.title || slug)}</a></p>
    <h1>${esc(data.title || 'Leaderboard')}</h1>
    <p class="lede">${esc(comp.title || '')} — ranked by ${esc(rankKey === 'judge' ? 'judge win rate' : rankKey)}${data.phase?.title ? ` · ${esc(data.phase.title)} phase` : ''}. ${num(entries.length)} entries ranked.</p>
    <div class="tabs" role="navigation" aria-label="Leaderboard views">
      ${(data.views || ['performance']).map((v) => `
        <a href="#/bounty/${encodeURIComponent(slug)}/leaderboard?view=${encodeURIComponent(v)}" class="${v === view ? 'active' : ''}">${esc(v)}</a>`).join('')}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Entry</th>${columns.map((c) => `<th class="num">${esc(c.title)}</th>`).join('')}</tr></thead>
      <tbody>
        ${slice.map((e) => `
          <tr>
            <td class="rank">${num(e.rank)}</td>
            <td>${entryCell(e)}</td>
            ${columns.map((c) => columnCell(c, e)).join('')}
          </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="pager">
      <button type="button" data-page="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>← Previous</button>
      <span class="page-info">Page ${safePage} of ${totalPages} · ${num(entries.length)} entries</span>
      <button type="button" data-page="${safePage + 1}" ${safePage >= totalPages ? 'disabled' : ''}>Next →</button>
    </div>
    ${data.metrics_withheld ? '<p class="small">Some metrics are withheld by the competition until results are final.</p>' : ''}`;
}

/* ----------------------------------------------------------------- profile */

export function profileView(p) {
  const rec = p.record || {};
  const sols = p.solutions || [];
  const img = p.image || p.avatar;
  return `
    <div class="profile-head">
      ${img ? `<img class="avatar lg" crossorigin="anonymous" src="${esc(img)}" alt="Avatar of ${esc(p.handle)}">` : ''}
      <div>
        <h1>@${esc(p.handle)}</h1>
        ${p.display_name ? `<p class="muted">${esc(p.display_name)}</p>` : ''}
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        <p class="profile-meta">Joined ${date(p.joined_at)}${p.github_login ? ` · GitHub <a href="https://github.com/${encodeURIComponent(p.github_login)}">@${esc(p.github_login)}</a>` : ''}${p.x ? ` · X <a href="https://x.com/${encodeURIComponent(p.x)}">@${esc(p.x)}</a>` : ''}</p>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>${num(rec.competitions_entered)}</b><span>Bounties entered</span></div>
      <div class="stat"><b>${num(rec.competitions_placed)}</b><span>Placed</span></div>
      <div class="stat"><b>${num(rec.competitions_won)}</b><span>Won</span></div>
      <div class="stat"><b>${num(rec.podium_finishes)}</b><span>Podiums</span></div>
      <div class="stat"><b>${rec.best_placement ? `#${num(rec.best_placement)}` : '—'}</b><span>Best placement</span></div>
      <div class="stat"><b class="pot">${money(rec.prize_usd)}</b><span>Prize money</span></div>
    </div>
    <h2>Entries (${num(sols.length)})</h2>
    ${sols.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Bounty</th><th>Entry</th><th class="num">Placed</th><th class="num">Prize</th><th class="num">Score</th><th class="num">Entered</th></tr></thead>
      <tbody>
        ${sols.map((s) => `
          <tr>
            <td><a href="#/bounty/${encodeURIComponent(s.competition.slug)}">${esc(s.competition.title)}</a><span class="sub">${esc(s.competition.category || '')} · ${date(s.competition.deadline)}</span></td>
            <td>${esc(s.title || '—')}</td>
            <td class="num">${s.placement ? `#${num(s.placement)}` : '—'}</td>
            <td class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
            <td class="num">${esc(s.score?.display ?? s.score?.value ?? '—')}${s.score?.column ? `<span class="sub">${esc(s.score.column.title)}</span>` : ''}</td>
            <td class="num">${date(s.entered_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>` : '<p class="muted">No entries yet.</p>'}
    <p class="cache-note">Public profile on <a href="https://make.fun${esc(p.profile_url || `/u/${encodeURIComponent(p.handle)}`)}">make.fun</a>.</p>`;
}

/* ------------------------------------------------------------------- states */

export function loadingView(label) {
  return `<div class="loading">Loading ${esc(label)}</div>`;
}

export function errorView(message) {
  return `<div class="error"><p><strong>Could not load this page.</strong></p><p>${esc(message)}</p><p><button type="button" data-retry="1">Try again</button></p></div>`;
}

export function notFoundView(what) {
  return `<div class="empty"><p><strong>${esc(what)} not found.</strong></p><p><a href="#/">Back to the board</a></p></div>`;
}

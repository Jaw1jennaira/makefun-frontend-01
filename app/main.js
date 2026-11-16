// A make.fun frontend: the board, a bounty page, its leaderboard and a
// public profile, on hash routes. One API request a view; answers are cached
// (see api.js) and countdowns tick without re-rendering the page.
//
//   #/                                the bounty board
//   #/bounty/<slug>                   one bounty: rewards, dates, rules
//   #/bounty/<slug>/leaderboard       that bounty's leaderboard (?view=…)
//   #/u/<handle>                      an account's public profile
//
// window.__shotReady is false while a route loads and true once its data is
// on screen, so a screenshot script knows when to capture.

import { apiStats, getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { money, timeLeft } from './format.js';
import {
  boardRows,
  boardTotals,
  boardView,
  bountyView,
  errorView,
  leaderboardView,
  loadingView,
  notFoundView,
  profileView,
} from './views.js';

const app = document.getElementById('app');
let routeToken = 0;

/* ------------------------------------------------------------ countdowns */

function tickCountdowns() {
  for (const el of document.querySelectorAll('[data-countdown]')) {
    el.textContent = timeLeft(el.getAttribute('data-countdown'));
  }
}
setInterval(tickCountdowns, 30_000);

/* ------------------------------------------------------------ board state */

let boardItems = [];
let boardQuery = '';
let boardSort = 'pot';
let boardFilter = 'all';

function sortBoard(items) {
  const by = {
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0),
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    entries: (a, b) => Number(b.submissionCount ?? 0) - Number(a.submissionCount ?? 0),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
  }[boardSort] || ((a, b) => 0);
  return items.slice().sort(by);
}

function filteredBoard() {
  const q = boardQuery.trim().toLowerCase();
  let items = boardItems;
  if (boardFilter === 'open') items = items.filter((b) => new Date(b.deadline).getTime() > Date.now());
  else if (boardFilter === 'closing') items = items.filter((b) => new Date(b.deadline).getTime() > Date.now() && new Date(b.deadline).getTime() - Date.now() < 86400000);
  else if (boardFilter === 'free') items = items.filter((b) => !b.entryFeeUsd);
  if (q) {
    items = items.filter((b) =>
      [b.title, b.summary, b.category, (b.skills || []).join(' ')].join(' ').toLowerCase().includes(q),
    );
  }
  return sortBoard(items);
}

function paintBoardList() {
  const list = document.getElementById('board-list');
  const count = document.getElementById('board-count');
  const note = document.getElementById('board-note');
  if (!list) return;
  const items = filteredBoard();
  list.innerHTML = boardRows(items);
  if (count) count.textContent = `${items.length} of ${boardItems.length} bounties`;
  const totals = boardTotals(boardItems);
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('hero-pot', money(totals.potUsd));
  set('hero-open', String(totals.open));
  set('hero-entries', totals.entries.toLocaleString('en-US'));
  set('hero-closing', String(totals.closing));
  if (note) note.textContent = `Live from the make.fun API · ${apiStats.requests} request${apiStats.requests === 1 ? '' : 's'} this session (${apiStats.cached} served from cache, ${apiStats.revalidated} revalidated).`;
}

function wireBoard() {
  const search = document.getElementById('board-search');
  const sort = document.getElementById('board-sort');
  if (search) {
    search.value = boardQuery;
    search.addEventListener('input', () => {
      boardQuery = search.value;
      paintBoardList();
    });
  }
  if (sort) {
    sort.value = boardSort;
    sort.addEventListener('change', () => {
      boardSort = sort.value;
      paintBoardList();
    });
  }
  const filters = document.getElementById('board-filters');
  if (filters) {
    for (const btn of filters.querySelectorAll('[data-filter]')) {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === boardFilter);
      btn.addEventListener('click', () => {
        boardFilter = btn.getAttribute('data-filter');
        for (const b of filters.querySelectorAll('[data-filter]')) b.classList.toggle('active', b === btn);
        paintBoardList();
      });
    }
  }
}

/* ------------------------------------------------------------ leaderboard */

let lbPage = 1;
let lbView = 'performance';
let lbData = null;
let lbSlug = '';

function paintLeaderboard() {
  if (!lbData) return;
  app.innerHTML = leaderboardView(lbData, lbSlug, lbPage, lbView);
  wirePager();
}

function wirePager() {
  for (const btn of app.querySelectorAll('[data-page]')) {
    btn.addEventListener('click', () => {
      lbPage = Number(btn.getAttribute('data-page'));
      paintLeaderboard();
      window.scrollTo(0, 0);
    });
  }
}

/* ------------------------------------------------------------------ router */

function parseRoute() {
  const hash = location.hash || '#/';
  const [pathPart, queryPart] = hash.slice(1).split('?');
  const query = new URLSearchParams(queryPart || '');
  const parts = pathPart.split('/').filter(Boolean);
  if (parts[0] === 'bounty' && parts[1]) {
    if (parts[2] === 'leaderboard') return { name: 'leaderboard', slug: decodeURIComponent(parts[1]), view: query.get('view') || 'performance', page: Number(query.get('page') || 1) || 1 };
    return { name: 'bounty', slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'u' && parts[1]) return { name: 'profile', handle: decodeURIComponent(parts[1]) };
  return { name: 'board' };
}

function setNav(route) {
  for (const a of document.querySelectorAll('[data-nav]')) {
    const kind = a.getAttribute('data-nav');
    a.classList.toggle(
      'active',
      (kind === 'board' && route.name === 'board') ||
        (kind === 'featured' && route.name !== 'board' && route.name !== 'profile') ||
        (kind === 'profile' && route.name === 'profile'),
    );
  }
}

async function render() {
  const token = ++routeToken;
  const route = parseRoute();
  setNav(route);
  window.__shotReady = false;

  try {
    if (route.name === 'board') {
      document.title = 'make.fun bounties';
      app.innerHTML = boardView();
      wireBoard();
      const data = await getBounties();
      if (token !== routeToken) return;
      boardItems = data.items || [];
      paintBoardList();
    } else if (route.name === 'bounty') {
      document.title = 'Loading… | make.fun bounties';
      app.innerHTML = loadingView('the bounty');
      const b = await getBounty(route.slug);
      if (token !== routeToken) return;
      if (!b || b.error || !b.slug) {
        app.innerHTML = notFoundView('Bounty');
      } else {
        document.title = `${b.title} | make.fun bounties`;
        app.innerHTML = bountyView(b);
      }
    } else if (route.name === 'leaderboard') {
      document.title = 'Loading… | make.fun bounties';
      app.innerHTML = loadingView('the leaderboard');
      lbSlug = route.slug;
      lbView = route.view;
      lbPage = route.page;
      const [b, data] = await Promise.all([getBounty(route.slug), getLeaderboard(route.slug, route.view)]);
      if (token !== routeToken) return;
      if (!b || b.error || !b.slug) {
        app.innerHTML = notFoundView('Bounty');
      } else {
        document.title = `Leaderboard: ${b.title} | make.fun bounties`;
        lbData = data;
        paintLeaderboard();
      }
    } else if (route.name === 'profile') {
      document.title = 'Loading… | make.fun bounties';
      app.innerHTML = loadingView('the profile');
      const p = await getProfile(route.handle);
      if (token !== routeToken) return;
      if (!p || p.error || !p.handle) {
        app.innerHTML = notFoundView('Profile');
      } else {
        document.title = `@${p.handle} | make.fun bounties`;
        app.innerHTML = profileView(p);
      }
    }
  } catch (err) {
    if (token !== routeToken) return;
    app.innerHTML = errorView(err.status ? `The make.fun API answered ${err.status}.` : 'The make.fun API could not be reached. Check the connection and try again.');
  }

  window.scrollTo(0, 0);
  window.__shotReady = true;
}

app.addEventListener('click', (event) => {
  const retry = event.target.closest('[data-retry]');
  if (retry) render();
});

// A broken avatar (an entry whose image is gone) falls back to the grey
// circle the CSS draws behind it, instead of a broken-image icon.
app.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement) event.target.remove();
}, true);

window.addEventListener('hashchange', render);
render();

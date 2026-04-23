'use strict';

const REFRESH_INTERVAL = 30_000; // 30 seconds

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtCost(usd) {
  if (usd < 0.01) return '<$0.01';
  return '$' + usd.toFixed(usd >= 10 ? 1 : 2);
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function pct(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

function barColor(p) {
  if (p >= 90) return 'red';
  if (p >= 60) return '';
  return 'green';
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function statBox(label, value, sub, accentClass = '') {
  return `
    <div class="stat-box">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${accentClass}">${value}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>`;
}

function tokenBar(label, value, max, unit = '') {
  const p = max ? pct(value, max) : 0;
  const color = barColor(p);
  const valStr = fmtTokens(value) + (unit ? ' ' + unit : '');
  const maxStr = max ? ' / ' + fmtTokens(max) : '';
  return `
    <div class="bar-section">
      <div class="bar-header">
        <span class="bar-label">${label}</span>
        <span class="bar-value">${valStr}${maxStr}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${color}" style="width:${p}%"></div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render(data) {
  const { today, allTime } = data;

  const todayTotal = today.input + today.output + today.cacheCreate + today.cacheRead;
  const allTotal   = allTime.input + allTime.output + allTime.cacheCreate + allTime.cacheRead;

  // The daily limit for Claude Code Pro is ~1M tokens contextual (soft).
  // We show relative bars; user can set their own limit via localStorage.
  const dailyLimit  = parseInt(localStorage.getItem('dailyLimit') || '0', 10);
  const outputLimit = parseInt(localStorage.getItem('outputLimit') || '0', 10);

  el('body-content').innerHTML = `
    <div class="section-label">Today</div>
    <div class="stats-row">
      ${statBox('Total Tokens', fmtTokens(todayTotal), 'all types', '')}
      ${statBox('Est. Cost', fmtCost(today.cost), 'USD', 'accent')}
    </div>

    ${tokenBar('Input', today.input, dailyLimit, 'tokens')}
    ${tokenBar('Output', today.output, outputLimit, 'tokens')}

    <div class="divider"></div>

    <div class="section-label">All-Time Session</div>
    <div class="stats-row">
      ${statBox('Total Tokens', fmtTokens(allTotal), 'all sessions', '')}
      ${statBox('Est. Cost', fmtCost(allTime.cost), 'USD', 'green')}
    </div>
  `;

  el('header-sub').innerHTML = 'Claude Code Monitor';
  el('last-updated').textContent = 'Updated ' + fmtTime(data.updatedAt);
}

// ── Load & refresh ────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const data = await window.claude.getUsage();
    render(data);
  } catch (err) {
    el('body-content').innerHTML = `
      <div class="loading" style="color:#E06060">
        Error reading usage data.<br>
        <small style="font-size:9px;margin-top:4px;display:block">${err.message || err}</small>
      </div>`;
  }
}

let refreshTimer;

function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadData, REFRESH_INTERVAL);
}

// ── Drag (mouse-based, since -webkit-app-region covers the header) ────────────
// The header uses -webkit-app-region: drag so Electron handles it natively.

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  startAutoRefresh();

  el('btn-close').addEventListener('click', () => window.claude.closeWindow());

  let minimized = false;
  el('btn-min').addEventListener('click', () => {
    minimized = !minimized;
    document.body.classList.toggle('minimized', minimized);
    window.claude.minimizeWindow();
  });

  el('btn-refresh').addEventListener('click', () => {
    clearInterval(refreshTimer);
    loadData();
    startAutoRefresh();
  });
});

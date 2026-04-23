# Claude Usage Overlay

Always-on-top desktop widget that shows real-time token usage and estimated costs
for **Claude Code** sessions — styled in Claude's own dark/orange color scheme.

## What it shows

| Metric | Source |
|--------|--------|
| Today's tokens (input / output / cache) | `~/.claude/projects/**/*.jsonl` |
| Estimated cost (USD) | Anthropic pricing for Claude Sonnet 4.x |
| All-time session totals | same JSONL files |

Costs are calculated using current Anthropic rates:
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens
- Cache creation: $3.75 / 1M tokens
- Cache read: $0.30 / 1M tokens

## Requirements

- **Node.js** ≥ 18
- **npm**
- A desktop environment (X11 / Wayland / macOS / Windows)

## Install & run

```bash
cd claude-usage-overlay
npm install
npm start
```

The widget appears in the **top-right corner** of your screen, always on top.

## Controls

| Button | Action |
|--------|--------|
| `−` (yellow) | Toggle compact / expanded view |
| `✕` (red) | Quit |
| `↻ Refresh` | Force-reload usage data |

Auto-refreshes every **30 seconds**.

## Optional: set daily limits

Open the browser DevTools console (`Ctrl+Shift+I`) and run:

```js
// Show progress bar vs a daily input token limit (e.g. 500K)
localStorage.setItem('dailyLimit', '500000');

// Show progress bar vs a daily output token limit (e.g. 50K)
localStorage.setItem('outputLimit', '50000');
```

Then hit **↻ Refresh**.

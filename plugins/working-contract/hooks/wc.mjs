#!/usr/bin/env node
// working-contract. One file, three events. Guarded: any failure exits 0 and names what went dark.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const BANDS = { fh: [70, 80], sd: [85, 90], ctx: [400_000, 500_000] };
const PLUGIN = process.env.CLAUDE_PLUGIN_ROOT ?? join(import.meta.dirname, '..');
const REPO = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const LIVE = { question: ['OPEN', 'DEFERRED'], work: ['UNSPECIFIED', 'BUILDABLE'] };
// The Stop refusal is NARROWER than the state report. Imperative 4 says "whenever a question is
// open", and imperative 19 makes DEFERRED a status beside OPEN, not a kind of it. A deferred
// question therefore stays in the state report and leaves the gate.
const GATED = ['OPEN'];
// Item files that violate imperative 17 by carrying no status. Filled by items(), named at a start.
const SKIPPED = [];

let input = {};
try {
  let raw = '';
  if (!process.stdin.isTTY) for await (const c of process.stdin) raw += c;
  input = JSON.parse(raw) || {};
} catch { /* no payload is not an error */ }

const dot = (v, [y, r]) => (v === null ? '⚪' : v >= r ? '🔴' : v >= y ? '🟡' : '🟢');

// The desktop app's usage series. Samples before the last downward step belong to a window that has
// already turned over, so they are dropped rather than reported.
function usage() {
  const p = join(homedir(), 'Library', 'Application Support', 'Claude', 'plan-usage-history.json');
  if (process.platform !== 'darwin' || !existsSync(p)) return null;
  try {
    const all = (JSON.parse(readFileSync(p, 'utf8')).samples ?? [])
      .filter((r) => r && r.u && Number.isFinite(r.t) && typeof r.u.fh === 'number');
    if (!all.length) return null;
    let start = 0;
    for (let i = 1; i < all.length; i++) if (all[i].u.fh < all[i - 1].u.fh) start = i;
    const last = all[all.length - 1];
    return {
      fh: last.u.fh,
      sd: typeof last.u.sd === 'number' ? last.u.sd : null,
      ageMin: Math.max(0, Math.round((Date.now() - last.t) / 60000)),
      dropped: start,
    };
  } catch { return null; }
}

function contextTokens() {
  const t = input.transcript_path;
  if (!t || !existsSync(t)) return null;
  try {
    const lines = readFileSync(t, 'utf8').trimEnd().split('\n');
    for (let i = lines.length - 1; i >= 0 && i > lines.length - 400; i--) {
      const u = JSON.parse(lines[i])?.message?.usage;
      if (u) return (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    }
  } catch { /* an unreadable transcript is a not-readable row, never a guess */ }
  return null;
}

function gauge() {
  const u = usage();
  const ctx = contextTokens();
  const fh = u ? u.fh : null;
  const sd = u ? u.sd : null;
  const pct = (v) => (v === null ? 'not readable' : `${v} %`);
  const tok = (v) => (v === null ? 'not readable' : `~${Math.round(v / 1000)}k`);
  const src = u ? `desktop · ${u.ageMin} min old` : 'no source';
  const dots = [dot(fh, BANDS.fh), dot(ctx, BANDS.ctx), dot(sd, BANDS.sd)];
  const band = dots.includes('🔴')
    ? 'RED — stop spawning. Imperative 36: offer wrap up.'
    : dots.slice(0, 1).concat(dots[2]).includes('🟡')
      ? 'Amber on a rate row — at most two concurrent agents. Imperative 36: offer wrap up.'
      : dots[1] === '🟡'
        ? 'Amber on the context row — cut context before spawning more. Imperative 36: offer wrap up.'
        : dots.includes('⚪')
          ? 'A row is not readable — it borrows no number, and forecast by hand.'
          : 'Green — up to six concurrent agents.';
  return [
    '---', '&nbsp;', '---', '',
    '| | Reading | Red at | Source |',
    '|---|---|---|---|',
    `| **5-hour window** | ${dots[0]} ${pct(fh)} | 80 % | ${src} |`,
    `| **Context window** | ${dots[1]} ${tok(ctx)} | 500k | transcript |`,
    `| **Weekly all models** | ${dots[2]} ${pct(sd)} | 90 % | ${src} |`,
    '', band,
  ].join('\n');
}

function items() {
  const d = join(REPO, 'docs', 'items');
  if (!existsSync(d)) return [];
  const out = [];
  SKIPPED.length = 0;
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.md')) continue;
    let head;
    try { head = readFileSync(join(d, f), 'utf8').slice(0, 2000); } catch { continue; }
    const g = (k) => head.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
    const status = g('status');
    if (!status) { SKIPPED.push(f); continue; }
    out.push({ id: g('id') ?? f.replace(/\.md$/, ''), kind: g('kind') ?? 'work', status, title: g('title') ?? '' });
  }
  return out;
}

const live = (all) => all.filter((i) => (LIVE[i.kind] ?? LIVE.work).includes(i.status));
const gated = (all) => all.filter((i) => i.kind === 'question' && GATED.includes(i.status));

function sessionStart() {
  const rules = existsSync(join(PLUGIN, 'RULES.md')) ? readFileSync(join(PLUGIN, 'RULES.md'), 'utf8') : null;
  const all = items();
  const open = live(all).filter((i) => i.kind === 'question');
  const work = live(all).filter((i) => i.kind !== 'question');
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const name = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
    + `_${p(now.getHours())}-${p(now.getMinutes())}_${basename(REPO).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const out = [];
  if (rules) out.push(rules.trimEnd());
  else out.push('RULES.md is missing from the plugin root — no rules are in force this session.');
  out.push('', `SESSION NAME — set the title to \`${name}\`.`,
    '  The title tool takes `session_id: "self"`. No lookup, no ID, nothing to read first.',
    '  If its schema is deferred, load that before calling it — the bare name says none of this.');
  const asked = all.filter((i) => i.kind === 'question').length;
  out.push('', `QUESTIONS ${open.length} live of ${asked}${open.length ? ' · ' + open.map((i) => i.id).join(' ') : ''}`);
  out.push(`WORK ${work.length} live of ${all.length - asked}${work.length ? ' · ' + work.slice(0, 8).map((i) => `${i.id} ${i.status}`).join(' · ') : ''}`);
  if (SKIPPED.length) out.push(`NO STATUS ${SKIPPED.length} · ${SKIPPED.join(' ')} — outside both counts, against imperative 17`);
  out.push('', gauge());
  out.push('', 'START-MODE CARD — raise it now, single-select, before anything else.',
    '  Imperative 2 names the four modes verbatim; offer those and nothing else.');
  return out.join('\n');
}

// Did this turn already call a card? Walk back to the prompt that started it.
function cardThisTurn() {
  const t = input.transcript_path;
  if (!t || !existsSync(t)) return true;              // unreadable: never refuse
  try {
    const lines = readFileSync(t, 'utf8').trimEnd().split('\n');
    for (let i = lines.length - 1; i >= 0 && i > lines.length - 400; i--) {
      let o;
      try { o = JSON.parse(lines[i]); } catch { continue; }
      if (o?.isSidechain) continue;
      const m = o?.message;
      if (m?.role === 'assistant' && Array.isArray(m.content)
        && m.content.some((c) => c?.type === 'tool_use' && c.name === 'AskUserQuestion')) return true;
      if (o?.type === 'user' && typeof m?.content === 'string') return false;
    }
  } catch { return true; }
  return true;
}

try {
  const event = input.hook_event_name ?? process.argv[2] ?? '';
  if (event === 'SessionStart') process.stdout.write(sessionStart() + '\n');
  else if (event === 'UserPromptSubmit') process.stdout.write(gauge() + '\n');
  else if (event === 'Stop') {
    const open = gated(items());
    if (open.length && !cardThisTurn()) {
      process.stderr.write(`A turn ends with a card while a question is open: ${open.map((i) => i.id).join(' ')}.\n`);
      process.exit(2);
    }
  }
} catch (e) {
  process.stdout.write(`working-contract went dark this turn: ${e.message}\n`);
}
process.exit(0);

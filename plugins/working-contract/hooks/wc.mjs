#!/usr/bin/env node
// working-contract. One file, three events. Guarded: any failure exits 0 and names what went dark.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const BANDS = { ctx: [500_000, 700_000] };
// Rule 29: the allowance a session starts with, and the word that marks a card as an allowance card.
const ALLOWANCE = { start: 2, word: /allowance/i };
const PLUGIN = process.env.CLAUDE_PLUGIN_ROOT ?? join(import.meta.dirname, '..');
const REPO = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const LIVE = { question: ['OPEN'], work: ['UNSPECIFIED', 'BUILDABLE'] };
const GATED = ['OPEN'];
// Every status rule 18 defines. A file carrying anything else — a retired word, or one a
// project invented for itself — passes the SKIPPED check, then fails the LIVE filter, and would
// sit in the denominator unnamed for good. UNKNOWN names it instead. It reports; it never refuses.
const KNOWN = { question: ['OPEN', 'ANSWERED'], work: ['UNSPECIFIED', 'BUILDABLE', 'BUILT', 'DROPPED'] };
// Item files that violate rule 18 by carrying no status. Filled by items(), named at a start.
const SKIPPED = [];
const UNKNOWN = [];

let input = {};
try {
  let raw = '';
  if (!process.stdin.isTTY) for await (const c of process.stdin) raw += c;
  input = JSON.parse(raw) || {};
} catch { /* no payload is not an error */ }

const dot = (v, [y, r]) => (v === null ? '⚪' : v >= r ? '🔴' : v >= y ? '🟡' : '🟢');

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

// Rule 29: spawns are the lead's Agent calls; the allowance is the start plus the first whole number
// in each answer to a card question that says "allowance". A dismissed card adds nothing. Read from
// this session's own transcript, so it is never stale; unreadable, the row says so and borrows nothing.
function agents() {
  const t = input.transcript_path;
  if (!t || !existsSync(t)) return null;
  try {
    let spawned = 0;
    let allowed = ALLOWANCE.start;
    const cards = new Map();
    for (const l of readFileSync(t, 'utf8').split('\n')) {
      let o;
      try { o = JSON.parse(l); } catch { continue; }
      const m = o?.message;
      if (o?.isSidechain || !Array.isArray(m?.content)) continue;
      for (const c of m.content) {
        if (m.role === 'assistant' && c?.type === 'tool_use') {
          if (c.name === 'Agent' || c.name === 'Task') spawned++;
          else if (c.name === 'AskUserQuestion')
            cards.set(c.id, (c.input?.questions ?? []).map((q) => String(q?.question ?? '')));
        } else if (c?.type === 'tool_result' && cards.has(c.tool_use_id) && !c.is_error) {
          const answers = o.toolUseResult?.answers ?? {};
          for (const q of cards.get(c.tool_use_id)) {
            const a = String(answers[q] ?? '');
            if (!ALLOWANCE.word.test(q) || a.startsWith('[User dismissed')) continue;
            allowed += Number(a.match(/\d+/)?.[0] ?? 0);
          }
        }
      }
    }
    return { spawned, allowed };
  } catch { return null; }
}

function gauge() {
  const ctx = contextTokens();
  const a = agents();
  const d = dot(ctx, BANDS.ctx);
  const tok = (v) => (v === null ? 'not readable' : `~${Math.round(v / 1000)}k`);
  const spent = a !== null && a.spawned >= a.allowed;
  const lines = [];
  if (d === '🔴') lines.push('RED on the context row — stop spawning.');
  else if (d === '🟡') lines.push('Amber on the context row — no new agent until the PRINCIPAL cuts the context.');
  if (spent) lines.push('Allowance spent — spawn nothing; put an allowance card: wrap up, or 2, 6 or 10 more.');
  if (!lines.length) lines.push('Green — up to six concurrent agents.');
  if (d === '⚪') lines.push('The context row is not readable — it borrows no number and does not on its own stop a spawn.');
  // Rule 27: past the amber band the wrap-up is suggested, never started. On amber and red alike,
  // because a session reads a bare "cut" as "end the session".
  const wrap = d === '🟡' || d === '🔴'
    ? ['', `Context is past ${BANDS.ctx[0] / 1000}k — a wrap-up is suggested. Only the PRINCIPAL takes it; until they do, the session works on and starts no step of it.`]
    : [];
  return [
    '---', '&nbsp;', '---', '',
    '| | Reading | Red at | Source |',
    '|---|---|---|---|',
    `| **Context window** | ${d} ${tok(ctx)} | ${BANDS.ctx[1] / 1000}k | transcript |`,
    `| **Agents spawned** | ${a ? `${a.spawned} of ${a.allowed}` : 'not readable'} | — | transcript |`,
    '', lines.join(' '), ...wrap,
  ].join('\n');
}

function items() {
  const d = join(REPO, 'docs', 'items');
  if (!existsSync(d)) return [];
  const out = [];
  SKIPPED.length = 0;
  UNKNOWN.length = 0;
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.md')) continue;
    let head;
    try { head = readFileSync(join(d, f), 'utf8').slice(0, 2000); } catch { continue; }
    const g = (k) => head.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
    const status = g('status');
    if (!status) { SKIPPED.push(f); continue; }
    const kind = g('kind') ?? 'work';
    if (!(KNOWN[kind] ?? KNOWN.work).includes(status)) UNKNOWN.push(`${f.replace(/\.md$/, '')}=${status}`);
    out.push({ id: g('id') ?? f.replace(/\.md$/, ''), kind, status, title: g('title') ?? '', file: f });
  }
  return out;
}

// Rule 18 has UNSPECIFIED name the decision it waits on, and rule 2 makes the PRINCIPAL's a card.
// Nothing can read WHOSE a decision is, so this names the omission. It reports; it never refuses.
function unasked(all) {
  const d = join(REPO, 'docs', 'items');
  let text = '';
  for (const q of all.filter((i) => i.kind === 'question' && i.status === 'OPEN')) {
    try { text += readFileSync(join(d, q.file), 'utf8'); } catch { /* an unreadable question cites nothing */ }
  }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
  return all
    .filter((i) => i.kind !== 'question' && i.status === 'UNSPECIFIED')
    .filter((i) => !new RegExp(`(^|[^A-Za-z0-9.])${esc(i.id)}([^A-Za-z0-9.]|$)`).test(text))
    .map((i) => i.id);
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
  out.push(`WORK ${work.length} live of ${all.length - asked}${work.length ? ' · ' + work.map((i) => `${i.id} ${i.status}`).join(' · ') : ''}`);
  if (SKIPPED.length) out.push(`NO STATUS ${SKIPPED.length} · ${SKIPPED.join(' ')} — outside both counts, against rule 18`);
  if (UNKNOWN.length) out.push(`UNKNOWN STATUS ${UNKNOWN.length} · ${UNKNOWN.join(' ')} — not a status rule 18 defines, so in no count. Migrate or answer.`);
  const noask = unasked(all);
  if (noask.length) out.push(`UNSPECIFIED WITHOUT A QUESTION ${noask.length} · ${noask.join(' ')} — no open question cites these, against rules 18 and 2`);
  out.push('', gauge());
  out.push('', 'OPEN WITH THE STATE, THEN ASK WHAT TO WORK ON AND ITS AGENT ALLOWANCE: 0, 2, 6 OR 10 — rule 31.',
    '  The card\'s question says "allowance", so the gauge counts the answer — rule 29.',
    '  Rule 21: every session ends with a wrap-up, offered on the card that ends a turn',
    '  in which something was decided or changed.');
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

// Rule 2: a question named on a card answered this session gates no more turns of it. Named = the
// id whole in a card's `question` text. Answered = its tool_result has no `is_error`, and the entry's
// `toolUseResult.answers` holds one value that is not `[User dismissed — …]`. A dismissal arrives in
// either shape: `is_error`, or every answer that marker. Any failure asks nothing, which leaves the
// gate as it was.
function askedThisSession() {
  const t = input.transcript_path;
  const text = [];
  const said = (a) => (a && typeof a === 'object' ? Object.values(a) : [])
    .some((v) => !String(v).startsWith('[User dismissed'));
  try {
    const cards = new Map();
    for (const l of readFileSync(t, 'utf8').split('\n')) {
      let o;
      try { o = JSON.parse(l); } catch { continue; }
      const m = o?.message;
      if (o?.isSidechain || !Array.isArray(m?.content)) continue;
      for (const c of m.content) {
        if (m.role === 'assistant' && c?.type === 'tool_use' && c.name === 'AskUserQuestion')
          cards.set(c.id, (c.input?.questions ?? []).map((q) => String(q?.question ?? '')).join('\n'));
        else if (c?.type === 'tool_result' && cards.has(c.tool_use_id) && !c.is_error
          && said(o.toolUseResult?.answers)) text.push(cards.get(c.tool_use_id));
      }
    }
  } catch { return () => false; }
  const all = text.join('\n');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => '\\' + c);
  return (id) => new RegExp(`(?<![\\w.])${esc(id)}(?!\\w|\\.\\w)`).test(all);
}

try {
  const event = input.hook_event_name ?? process.argv[2] ?? '';
  if (event === 'SessionStart') process.stdout.write(sessionStart() + '\n');
  else if (event === 'UserPromptSubmit') process.stdout.write(gauge() + '\n');
  else if (event === 'Stop') {
    const open = gated(items());
    if (open.length && !cardThisTurn()) {
      const asked = askedThisSession();
      const left = open.filter((i) => !asked(i.id));
      if (left.length) {
        process.stderr.write(`A turn ends with a card while a question is open: ${left.map((i) => i.id).join(' ')}`
          + ' — not counting any already named on a card answered this session.\n');
        process.exit(2);
      }
    }
  }
} catch (e) {
  process.stdout.write(`working-contract went dark this turn: ${e.message}\n`);
}
process.exit(0);

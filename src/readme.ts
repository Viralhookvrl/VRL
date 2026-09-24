import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMMUNITY_SWAPS } from './abi.ts';
import { listJson, readJson } from './storage.ts';
import type { Checkpoint, OutbreakSummary } from './storage.ts';
import type { MutationRecord } from './state.ts';

export const LIVE_START = '<!-- VIRAL:LIVE:START -->';
export const LIVE_END = '<!-- VIRAL:LIVE:END -->';

/// How many rows the rolling tables in the README carry.
const RECENT_ROWS = 8;
const INFECTOR_ROWS = 5;

/// Stands in for the table until the first sync lands. It says nothing about the contract or
/// about configuration — an empty archive is simply a state, and it is shown as one.
const DORMANT = [
  '```',
  '          \\   |   /',
  '        .--\'---\'--.',
  '       /           \\        no strain',
  '  ----(      ·      )----   no hosts',
  '       \\           /        no transmissions',
  '        \'--.---.--\'',
  '          /   |   \\',
  '```',
].join('\n');

const address = (value: string): string => `[\`${short(value)}\`](https://etherscan.io/address/${value})`;
const tx = (value: string): string => `[\`${value.slice(0, 10)}…\`](https://etherscan.io/tx/${value})`;
const block = (value: number): string => `[${value}](https://etherscan.io/block/${value})`;
const short = (value: string): string => `${value.slice(0, 6)}…${value.slice(-4)}`;
const percent = (bps: number): string => `${(bps / 100).toFixed(2)}%`;

/// The live section, rebuilt from the published JSON on every sync. Everything here is derived
/// from finalized Ethereum state; nothing is authored by hand.
export function liveSection(root: string): string {
  const path = join(root, 'live/state.json');
  if (!existsSync(path)) return DORMANT;
  const raw = readJson<Checkpoint | { status: 'UNCONFIGURED' }>(path);
  if ('status' in raw && raw.status === 'UNCONFIGURED') return DORMANT;
  const state = raw as Checkpoint;
  if (state.schemaVersion !== 1 || state.chainId !== 1) throw new Error('Cannot render unsupported live checkpoint');

  const summaryPath = join(root, 'live/outbreak.json');
  const summary = existsSync(summaryPath) ? readJson<OutbreakSummary>(summaryPath) : null;
  const mutations = listJson(join(root, 'mutations'), /^\d{6,}\.json$/);
  const transmissions = listJson(join(root, 'transmissions'), /^\d{9,}-\d{4,}\.json$/);

  const lines = [
    '| Outbreak | Current state |',
    '| --- | --- |',
    `| Strain | \`${state.strainCode}\` |`,
    `| Genome | \`${short(state.genome)}\` |`,
    `| Revision | [${state.revision}](mutations/) |`,
    `| Active hosts | ${state.activeHosts} |`,
    `| Immune hosts | ${state.immuneHosts} |`,
    `| Total transmissions | [${state.totalTransmissions}](transmissions/) |`,
    `| Eligible swaps | ${state.eligibleSwapCount} |`,
    `| Finalized through | ${block(state.lastProcessedBlock)} |`,
    `| Contract | [\`${state.contractAddress}\`](https://etherscan.io/address/${state.contractAddress}) |`,
  ];

  if (summary?.recentTransmissions.length) {
    lines.push('', '### Recent transmissions', '',
      '| Block | Infector | Host | Strain | Gen | Cut |',
      '| --- | --- | --- | --- | --- | --- |',
      ...summary.recentTransmissions.slice(0, RECENT_ROWS).map(entry =>
        `| ${block(entry.block)} | ${address(entry.source)} | ${address(entry.host)} `
        + `| \`${entry.displayStrain}\` | ${entry.generation} | ${percent(entry.rewardCutBps)} |`));
  }

  if (summary?.topInfectors.length) {
    lines.push('', '### Most transmissions caused', '',
      '| Wallet | Hosts infected |',
      '| --- | --- |',
      ...summary.topInfectors.slice(0, INFECTOR_ROWS).map(entry =>
        `| ${address(entry.address)} | ${entry.infections} |`));
  }

  const latest = mutations.at(-1);
  if (latest) {
    const mutation = readJson<MutationRecord>(join(root, 'mutations', latest));
    lines.push('', `Latest mutation: [revision ${mutation.revision}](mutations/${latest}) — `
      + `\`${mutation.displayStrain}\` at block ${block(mutation.block)}, in ${tx(mutation.tx)}.`);
  }

  lines.push('',
    `[State](live/state.json) · [Genome](live/genome.json) · [Outbreak](live/outbreak.json) · `
    + `[Infections](infections/) · [Mutations](mutations/) · [Transmissions](transmissions/)`,
    '',
    `${mutations.length} mutation${mutations.length === 1 ? '' : 's'} and `
    + `${transmissions.length} transmission${transmissions.length === 1 ? '' : 's'} archived. `
    + `An infection expires on a swap count, then the host stays immune for ${IMMUNITY_SWAPS} eligible swaps.`,
    '',
    '*Snapshot of finalized Ethereum state. This section updates when the sync workflow runs.*');
  return lines.join('\n');
}

/// Locates the one marker pair, or explains what is wrong with the README. A missing or
/// duplicated pair is a mistake worth failing on, not one to paper over.
export function assertReadmeMarkers(root: string): { text: string; start: number; end: number } {
  const path = join(root, 'README.md');
  if (!existsSync(path)) throw new Error('README.md is missing');
  const text = readFileSync(path, 'utf8');
  const start = text.indexOf(LIVE_START), end = text.indexOf(LIVE_END);
  if (start < 0 || end < start
    || text.indexOf(LIVE_START, start + 1) !== -1 || text.indexOf(LIVE_END, end + 1) !== -1) {
    throw new Error('README must contain one VIRAL LIVE marker pair');
  }
  return { text, start, end };
}

/// Touches only the marked section, so the surrounding prose stays authored.
export function renderReadme(root: string): boolean {
  const path = join(root, 'README.md');
  const { text: before, start, end } = assertReadmeMarkers(root);
  const after = before.slice(0, start + LIVE_START.length) + '\n\n' + liveSection(root) + '\n\n' + before.slice(end);
  if (after === before) return false;
  writeFileSync(path, after);
  return true;
}

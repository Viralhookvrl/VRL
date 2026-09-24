import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './config.ts';
import { readJson } from './storage.ts';
import type { Checkpoint } from './storage.ts';

/// The workflow uses this as the commit subject, so a run that only advanced the checkpoint reads
/// differently from one that archived an infection or a mutation.
const changes = execFileSync(
  'git', ['diff', '--cached', '--name-only', '--', 'live', 'infections', 'mutations', 'transmissions', 'README.md'],
  { cwd: ROOT, encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const state = readJson<Checkpoint>(join(ROOT, 'live/state.json'));
const added = (prefix: string): number => changes.filter(path => path.startsWith(prefix)).length;
const transmissions = added('transmissions/'), mutations = added('mutations/'), infections = added('infections/');

const parts: string[] = [];
if (transmissions) parts.push(`${transmissions} transmission${transmissions === 1 ? '' : 's'}`);
if (mutations) parts.push(`${mutations} mutation${mutations === 1 ? '' : 's'}`);
if (infections) parts.push(`${infections} host${infections === 1 ? '' : 's'}`);

console.log(parts.length
  ? `viral: sync block ${state.lastProcessedBlock} (${parts.join(', ')})`
  : `viral: sync block ${state.lastProcessedBlock}`);

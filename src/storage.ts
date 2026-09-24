import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { isAddress } from 'viem';
import type { Hex } from 'viem';
import { CHAIN_ID } from './config.ts';
import type { Config } from './config.ts';
import { displayStrain } from './decoder.ts';
import { Outbreak, isHostState, ZERO_GENOME } from './state.ts';
import type { InfectionRecord, MutationRecord, OutbreakState, Transmission } from './state.ts';

export interface Checkpoint extends OutbreakState {
  schemaVersion: 1; chainId: 1; contractAddress: Config['contractAddress']; deployBlock: number;
  lastProcessedBlockHash: Hex | null; updatedAt: string;
}

/// An address is only ever used as a filename after this. Anything that is not a well-formed
/// address is refused outright — a path never comes from unvalidated log data.
export function addressFile(address: string): string {
  if (!isAddress(address, { strict: false })) throw new Error(`Refusing to derive a filename from ${address}`);
  return `${address.toLowerCase()}.json`;
}

/// Keys are emitted in insertion order and the file always ends in a newline, so an unchanged
/// mirror produces a byte-identical file and the workflow commits nothing.
export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/// How many of the newest transmissions live/outbreak.json carries.
export const RECENT_TRANSMISSIONS = 25;

export const mutationFile = (revision: number): string => `${String(revision).padStart(6, '0')}.json`;
export const transmissionFile = (block: number, logIndex: number): string =>
  `${String(block).padStart(9, '0')}-${String(logIndex).padStart(4, '0')}.json`;

export function listJson(directory: string, pattern: RegExp): string[] {
  return existsSync(directory) ? readdirSync(directory).filter(name => pattern.test(name)).sort() : [];
}

/// Loads the previous run's mirror and rebuilds the in-memory outbreak from it, so a run only
/// ever fetches logs newer than the checkpoint. Any disagreement between the checkpoint and the
/// archived files stops the run rather than publishing a half-repaired archive.
export function loadCheckpoint(root: string, config: Config): { checkpoint: Checkpoint; outbreak: Outbreak } | null {
  const path = join(root, 'live/state.json');
  if (!existsSync(path)) return null;
  const raw = readJson<Checkpoint | { status: 'UNCONFIGURED' }>(path);
  if ('status' in raw && raw.status === 'UNCONFIGURED') return null;
  const checkpoint = raw as Checkpoint;
  if (checkpoint.schemaVersion !== 1 || checkpoint.chainId !== CHAIN_ID) throw new Error('Unknown checkpoint schema');
  if (checkpoint.contractAddress !== config.contractAddress || checkpoint.deployBlock !== config.deployBlock) {
    throw new Error('CONTRACT_ADDRESS or DEPLOY_BLOCK changed; delete live/, infections/, mutations/ and transmissions/ to rebuild');
  }
  if (!Number.isSafeInteger(checkpoint.lastProcessedBlock) || checkpoint.lastProcessedBlock < config.deployBlock) {
    throw new Error('Invalid checkpoint block');
  }

  const outbreak = new Outbreak();
  outbreak.revision = checkpoint.revision;
  outbreak.genome = checkpoint.genome;
  outbreak.eligibleSwapCount = checkpoint.eligibleSwapCount;
  outbreak.totalTransmissions = checkpoint.totalTransmissions;
  outbreak.hook = checkpoint.hook;

  // Mutation files are permanent and sequential; a hole means the archive was edited by hand.
  const mutations = listJson(join(root, 'mutations'), /^\d{6,}\.json$/);
  if (mutations.length !== checkpoint.revision) {
    throw new Error(`Expected ${checkpoint.revision} mutation files, found ${mutations.length}`);
  }
  mutations.forEach((name, index) => {
    const record = readJson<MutationRecord>(join(root, 'mutations', name));
    if (record.revision !== index + 1) throw new Error(`Mutation ${name} is out of sequence`);
  });

  const transmissions = listJson(join(root, 'transmissions'), /^\d{9,}-\d{4,}\.json$/);
  if (transmissions.length !== checkpoint.totalTransmissions) {
    throw new Error(`Expected ${checkpoint.totalTransmissions} transmissions, found ${transmissions.length}`);
  }

  for (const name of listJson(join(root, 'infections'), /^0x[0-9a-f]{40}\.json$/)) {
    const record = readJson<InfectionRecord>(join(root, 'infections', name));
    if (!isHostState(record.status)) throw new Error(`Infection ${name} has an unknown status`);
    if (addressFile(record.host) !== name) throw new Error(`Infection ${name} does not match its host`);
    if (record.block > checkpoint.lastProcessedBlock) throw new Error(`Infection ${name} is ahead of the checkpoint`);
    outbreak.infections.set(record.host, record);
  }
  return { checkpoint, outbreak };
}

/// The unconfigured placeholder, published before the two variables are set.
export function unconfigured(): unknown {
  return {
    schemaVersion: 1, chainId: CHAIN_ID, status: 'UNCONFIGURED',
    lastProcessedBlock: null, revision: 0, genome: ZERO_GENOME, strainCode: 'VRL-0000-0000',
    eligibleSwapCount: 0, activeHosts: 0, immuneHosts: 0, totalTransmissions: 0,
  };
}

/// Publishes the whole mirror in one step. Everything is staged first and the four directories
/// are swapped in at the end, so a process killed mid-write leaves the previous archive intact
/// and `recover` rolls the partial work back on the next run.
export function publish(
  root: string, config: Config, outbreak: Outbreak,
  block: number, blockHash: Hex | null, changedHosts: Iterable<string>,
): void {
  const stage = join(root, '.stage');
  const names = ['live', 'infections', 'mutations', 'transmissions'] as const;
  rmSync(stage, { recursive: true, force: true });
  for (const name of names) mkdirSync(join(stage, name), { recursive: true });
  try {
    // Permanent archives are carried over, then only new files are added on top; an existing
    // mutation or transmission file is never rewritten.
    for (const name of ['infections', 'mutations', 'transmissions'] as const) {
      if (existsSync(join(root, name))) cpSync(join(root, name), join(stage, name), { recursive: true });
    }
    for (const mutation of outbreak.mutations) {
      const path = join(stage, 'mutations', mutationFile(mutation.revision));
      if (existsSync(path)) throw new Error(`Mutation ${mutation.revision} already archived`);
      writeJson(path, mutation);
    }
    for (const transmission of outbreak.transmissions) {
      const path = join(stage, 'transmissions', transmissionFile(transmission.block, transmission.logIndex));
      if (existsSync(path)) throw new Error(`Transmission ${transmission.block}-${transmission.logIndex} already archived`);
      writeJson(path, transmission);
    }
    for (const host of changedHosts) {
      const record = outbreak.infections.get(host);
      if (record) writeJson(join(stage, 'infections', addressFile(host)), record);
    }

    const checkpoint: Checkpoint = {
      schemaVersion: 1, chainId: CHAIN_ID, contractAddress: config.contractAddress,
      deployBlock: config.deployBlock, ...outbreak.state(block),
      lastProcessedBlockHash: blockHash, updatedAt: new Date().toISOString(),
    };
    writeJson(join(stage, 'live/state.json'), checkpoint);
    writeJson(join(stage, 'live/genome.json'), {
      revision: outbreak.revision, genome: outbreak.genome,
      displayStrain: outbreak.revision === 0 ? 'VRL-0000-0000' : displayStrain(outbreak.genome),
      eligibleSwapCount: outbreak.eligibleSwapCount, block,
    });
    // Recent transmissions are read back out of the staged archive, so the rolling window
    // survives across runs even when this run added none of its own.
    const recent = listJson(join(stage, 'transmissions'), /^\d{9,}-\d{4,}\.json$/)
      .slice(-RECENT_TRANSMISSIONS).reverse()
      .map(name => readJson<Transmission>(join(stage, 'transmissions', name)));
    writeJson(join(stage, 'live/outbreak.json'), outbreakSummary(outbreak, block, recent));

    // The journal marks which directories existed, so a rollback knows what to restore.
    writeJson(join(stage, 'journal.json'),
      Object.fromEntries(names.map(name => [name, existsSync(join(root, name))])));
    for (const name of names) {
      const target = join(root, name);
      if (existsSync(target)) renameSync(target, join(stage, `old-${name}`));
      renameSync(join(stage, name), target);
    }
    // Dropping the journal is the commit point; the old snapshots are now disposable.
    rmSync(join(stage, 'journal.json'));
    rmSync(stage, { recursive: true, force: true });
  } catch (error) {
    recover(root);
    throw error;
  }
}

/// Rolls a killed run back to the archive it started from.
export function recover(root: string): void {
  const stage = join(root, '.stage');
  if (!existsSync(stage)) return;
  if (existsSync(join(stage, 'journal.json'))) {
    const journal = readJson<Record<string, boolean>>(join(stage, 'journal.json'));
    for (const name of ['live', 'infections', 'mutations', 'transmissions']) {
      const old = join(stage, `old-${name}`), target = join(root, name);
      if (existsSync(old)) { rmSync(target, { recursive: true, force: true }); renameSync(old, target); }
      else if (!journal[name]) rmSync(target, { recursive: true, force: true });
    }
  }
  rmSync(stage, { recursive: true, force: true });
}

export interface OutbreakSummary {
  block: number; revision: number; strainCode: string;
  activeHosts: number; immuneHosts: number; cleanedHosts: number;
  totalTransmissions: number; eligibleSwapCount: number;
  topInfectors: { address: string; infections: number }[];
  recentTransmissions: Transmission[];
}

/// The rolling view: leaderboard plus the newest transmissions, recomputed from the live records.
export function outbreakSummary(outbreak: Outbreak, block: number, recent: Transmission[] = []): OutbreakSummary {
  const caused = new Map<string, number>();
  let cleanedHosts = 0;
  for (const record of outbreak.infections.values()) {
    if (record.status === 'CLEAN') cleanedHosts++;
    caused.set(record.infector, (caused.get(record.infector) ?? 0) + 1);
  }
  const topInfectors = [...caused]
    .map(([address, infections]) => ({ address, infections }))
    .sort((a, b) => b.infections - a.infections || a.address.localeCompare(b.address))
    .slice(0, 10);
  return {
    block, revision: outbreak.revision,
    strainCode: outbreak.revision === 0 ? 'VRL-0000-0000' : displayStrain(outbreak.genome),
    ...outbreak.counts(), cleanedHosts,
    totalTransmissions: outbreak.totalTransmissions,
    eligibleSwapCount: outbreak.eligibleSwapCount,
    topInfectors, recentTransmissions: recent,
  };
}

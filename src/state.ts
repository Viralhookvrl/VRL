import type { Hex } from 'viem';
import { HOST_STATE, IMMUNITY_SWAPS } from './abi.ts';
import type { HostState } from './abi.ts';
import { compareEvents, displayStrain } from './decoder.ts';
import type { ViralEvent } from './decoder.ts';

export function requireEqual(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message);
}

export interface InfectionRecord {
  host: string; status: HostState; infector: string;
  strainCode: Hex; displayStrain: string; generation: number; rewardCutBps: number;
  createdSwap: number; expirySwap: number; immuneUntilSwap: number;
  block: number; tx: Hex;
}

export interface MutationRecord {
  revision: number; block: number; tx: Hex;
  previousGenome: Hex; newGenome: Hex;
  displayStrain: string; eligibleSwapCount: number;
}

export interface Transmission {
  source: string; host: string; strainCode: Hex; displayStrain: string;
  generation: number; rewardCutBps: number; block: number; logIndex: number; tx: Hex;
}

export const ZERO_GENOME = `0x${'0'.repeat(64)}` as Hex;

/// The contract never sweeps an expired infection: a record's meaning shifts as `eligibleSwapCount`
/// passes `expiresAtSwap` and then `+ IMMUNITY_SWAPS`. This mirrors VRLToken.stateOf exactly, so a
/// host's file changes status on the swap that changed it on-chain, with no event to announce it.
export function hostState(record: InfectionRecord, eligibleSwapCount: number): HostState {
  if (eligibleSwapCount < record.expirySwap) return 'INFECTED';
  if (eligibleSwapCount < record.expirySwap + IMMUNITY_SWAPS) return 'IMMUNE';
  return 'CLEAN';
}

export interface OutbreakState {
  lastProcessedBlock: number; revision: number; genome: Hex; strainCode: string;
  eligibleSwapCount: number; activeHosts: number; immuneHosts: number;
  totalTransmissions: number; hook: string | null;
}

/// Replays events into the mirrored outbreak. Applying the same event twice, or out of chain
/// order, is rejected rather than silently folded in — the archive must never double-count.
export class Outbreak {
  revision = 0;
  genome: Hex = ZERO_GENOME;
  eligibleSwapCount = 0;
  totalTransmissions = 0;
  hook: string | null = null;
  /// Current record per host, keyed by checksummed address.
  infections = new Map<string, InfectionRecord>();
  /// Files produced by this run, to be written once the whole batch replays cleanly.
  mutations: MutationRecord[] = [];
  transmissions: Transmission[] = [];
  touched = new Set<string>();
  last: ViralEvent | null = null;

  apply(event: ViralEvent): void {
    if (this.last && compareEvents(this.last, event) >= 0) throw new Error('Duplicate or out-of-order event');
    this.last = event;
    switch (event.type) {
      case 'HOOK':
        this.hook = event.hook ?? null;
        break;
      case 'MUTATION': {
        const revision = event.revision ?? 0;
        // Revisions are strictly sequential; a gap means a missed log, not a quiet chain.
        requireEqual(revision, this.revision + 1, `Missing genome revision ${this.revision + 1} (check DEPLOY_BLOCK)`);
        const previousGenome = this.genome;
        this.revision = revision;
        this.genome = event.genome ?? ZERO_GENOME;
        this.eligibleSwapCount = event.eligibleSwapCount ?? 0;
        this.mutations.push({
          revision, block: event.block, tx: event.tx, previousGenome, newGenome: this.genome,
          displayStrain: displayStrain(this.genome), eligibleSwapCount: this.eligibleSwapCount,
        });
        break;
      }
      case 'INFECTION': {
        const host = event.host!;
        const record: InfectionRecord = {
          host, status: 'INFECTED', infector: event.infector!,
          strainCode: event.strainCode!, displayStrain: displayStrain(event.strainCode!),
          generation: event.generation ?? 0, rewardCutBps: event.rewardCutBps ?? 0,
          createdSwap: event.createdAtSwap ?? 0, expirySwap: event.expiresAtSwap ?? 0,
          immuneUntilSwap: (event.expiresAtSwap ?? 0) + IMMUNITY_SWAPS,
          block: event.block, tx: event.tx,
        };
        // A host's file is overwritten by its newest infection; the transmission archive keeps
        // the old one, so no history is lost when a wallet is re-infected.
        this.infections.set(host, record);
        this.touched.add(host);
        this.totalTransmissions++;
        this.transmissions.push({
          source: record.infector, host, strainCode: record.strainCode, displayStrain: record.displayStrain,
          generation: record.generation, rewardCutBps: record.rewardCutBps,
          block: event.block, logIndex: event.logIndex, tx: event.tx,
        });
        break;
      }
      // Reward events carry no infection-network state; they are read for completeness only.
      case 'PAYOUT': case 'CUT': case 'LAPSE':
        break;
    }
  }

  /// Re-resolves every host against the live swap counter and reports which files changed.
  /// Expiry and immunity have no events, so this is the only thing that can move a status.
  refreshStatuses(): string[] {
    const changed: string[] = [];
    for (const [host, record] of this.infections) {
      const status = hostState(record, this.eligibleSwapCount);
      if (status !== record.status) {
        record.status = status;
        changed.push(host);
      }
    }
    return changed;
  }

  counts(): { activeHosts: number; immuneHosts: number } {
    let activeHosts = 0, immuneHosts = 0;
    for (const record of this.infections.values()) {
      if (record.status === 'INFECTED') activeHosts++;
      else if (record.status === 'IMMUNE') immuneHosts++;
    }
    return { activeHosts, immuneHosts };
  }

  state(lastProcessedBlock: number): OutbreakState {
    return {
      lastProcessedBlock, revision: this.revision, genome: this.genome,
      strainCode: this.revision === 0 ? 'VRL-0000-0000' : displayStrain(this.genome),
      eligibleSwapCount: this.eligibleSwapCount, ...this.counts(),
      totalTransmissions: this.totalTransmissions, hook: this.hook,
    };
  }
}

export const isHostState = (value: unknown): value is HostState =>
  typeof value === 'string' && (HOST_STATE as readonly string[]).includes(value);

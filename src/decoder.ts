import { decodeEventLog, getAddress, toEventSelector } from 'viem';
import type { Hex } from 'viem';
import { abi } from './abi.ts';

export interface ViralEvent {
  block: number; tx: Hex; transactionIndex: number; logIndex: number;
  type: 'HOOK' | 'MUTATION' | 'INFECTION' | 'PAYOUT' | 'CUT' | 'LAPSE';
  hook?: string;
  revision?: number; genome?: Hex; eligibleSwapCount?: number;
  host?: string; infector?: string; strainCode?: Hex; generation?: number;
  rewardCutBps?: number; createdAtSwap?: number; expiresAtSwap?: number;
  account?: string; net?: string; infectionCut?: string; amount?: string;
  windowId?: number; firstWindow?: number; cutBps?: number;
}

export interface RawLog {
  blockNumber: bigint | null; transactionHash: Hex | null; transactionIndex: number | null;
  logIndex: number | null; data: Hex; topics: Hex[]; removed?: boolean;
}

const topics = new Set(abi.filter(item => item.type === 'event').map(item => toEventSelector(item)));

export function safeNumber(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Unsafe integer: ${value}`);
  return n;
}

/// Checksummed, so a filename derived from it is stable across runs and RPCs.
export const normalize = (value: string): string => getAddress(value.toLowerCase());

export function decode(log: RawLog): ViralEvent | null {
  if (!topics.has(log.topics[0])) return null;
  if (log.removed || log.blockNumber === null || log.transactionHash === null
    || log.transactionIndex === null || log.logIndex === null) {
    throw new Error('Unconfirmed or removed log');
  }
  const base = {
    block: safeNumber(log.blockNumber), tx: log.transactionHash,
    transactionIndex: log.transactionIndex, logIndex: log.logIndex,
  };
  const event = decodeEventLog({ abi, data: log.data, topics: log.topics as [Hex, ...Hex[]], strict: true });
  switch (event.eventName) {
    case 'HookBound':
      return { ...base, type: 'HOOK', hook: normalize(event.args.hook) };
    case 'GenomeMutated':
      return {
        ...base, type: 'MUTATION', revision: safeNumber(event.args.revision),
        genome: event.args.genome, eligibleSwapCount: safeNumber(event.args.eligibleSwapCount),
      };
    case 'Infected':
      return {
        ...base, type: 'INFECTION', host: normalize(event.args.host), infector: normalize(event.args.infector),
        strainCode: event.args.strainCode, generation: safeNumber(BigInt(event.args.generation)),
        rewardCutBps: safeNumber(BigInt(event.args.rewardCutBps)),
        createdAtSwap: safeNumber(event.args.createdAtSwap), expiresAtSwap: safeNumber(event.args.expiresAtSwap),
      };
    case 'Payout':
      return {
        ...base, type: 'PAYOUT', account: normalize(event.args.account), net: event.args.net.toString(),
        infectionCut: event.args.infectionCut.toString(), infector: normalize(event.args.infector),
        windowId: safeNumber(event.args.windowId),
      };
    case 'CutFiled':
      return {
        ...base, type: 'CUT', infector: normalize(event.args.infector), host: normalize(event.args.host),
        amount: event.args.amount.toString(), firstWindow: safeNumber(event.args.firstWindow),
        cutBps: safeNumber(BigInt(event.args.cutBps)),
      };
    case 'TrancheLapsed':
      return {
        ...base, type: 'LAPSE', account: normalize(event.args.account),
        amount: event.args.amount.toString(), firstWindow: safeNumber(event.args.firstWindow),
      };
  }
}

/// Chain order: block, then position in the block. This is the only order events are ever applied in.
export const compareEvents = (a: ViralEvent, b: ViralEvent): number =>
  a.block - b.block || a.transactionIndex - b.transactionIndex || a.logIndex - b.logIndex;

/// A short, human-facing label for a 32-byte strain, e.g. "VRL-3F2A-91C4".
export function displayStrain(strainCode: Hex): string {
  const hex = strainCode.slice(2).toUpperCase();
  return `VRL-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

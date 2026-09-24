import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getAddress, toEventSelector, encodeAbiParameters, pad, toHex, keccak256, stringToHex } from 'viem';
import type { Hex } from 'viem';
import { abi } from '../src/abi.ts';
import type { RawLog } from '../src/decoder.ts';
import type { Config } from '../src/config.ts';

export const CONTRACT = getAddress('0x00000000000000000000000000000000000000c1');
export const DEPLOY_BLOCK = 21_000_000;
export const settings: Config = { contractAddress: CONTRACT, deployBlock: DEPLOY_BLOCK };

export const address = (n: number): Hex => getAddress(pad(toHex(n), { size: 20 })) as Hex;
export const strain = (n: number): Hex => keccak256(stringToHex(`strain-${n}`));

/// An indexed argument as the node would place it in a topic: 32 bytes, right-aligned.
const topic = (value: unknown): Hex =>
  pad(typeof value === 'string' ? (value as Hex) : toHex(value as bigint | number), { size: 32 });

const event = (name: string) => {
  const item = abi.find(entry => entry.type === 'event' && entry.name === name);
  if (!item || item.type !== 'event') throw new Error(`No such event: ${name}`);
  return item;
};

/// Encodes a log exactly as the node would return it, so the decoder is exercised for real.
export function log(name: string, args: Record<string, unknown>, block: number, logIndex: number, transactionIndex = 0): RawLog {
  const item = event(name);
  // `parseAbi` types each input precisely: an indexed parameter carries
  // `indexed: true`, a non-indexed one carries no `indexed` property at all. So
  // the union has no common `indexed` member to read — narrow with `in` instead.
  const indexed = item.inputs.filter(input => 'indexed' in input && input.indexed);
  const body = item.inputs.filter(input => !('indexed' in input) || !input.indexed);
  return {
    blockNumber: BigInt(block),
    transactionHash: keccak256(stringToHex(`tx-${block}-${logIndex}`)),
    transactionIndex, logIndex,
    data: encodeAbiParameters(body, body.map(input => args[input.name!])),
    topics: [toEventSelector(item), ...indexed.map(input => topic(args[input.name!]))] as Hex[],
  };
}

export const mutation = (revision: number, swaps: number, block: number, logIndex = 0): RawLog =>
  log('GenomeMutated', { revision: BigInt(revision), genome: strain(revision), eligibleSwapCount: BigInt(swaps) }, block, logIndex);

export const infection = (
  host: Hex, infector: Hex, block: number, logIndex: number,
  { created = 0, expires = 128, generation = 1, cut = 500, code = strain(1) } = {},
): RawLog => log('Infected', {
  host, infector, strainCode: code, generation, rewardCutBps: cut,
  createdAtSwap: BigInt(created), expiresAtSwap: BigInt(expires),
}, block, logIndex);

export function sandbox(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'viral-'));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}


import { fileURLToPath } from 'node:url';
import { getAddress, isAddress } from 'viem';
import type { Address } from 'viem';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const CHAIN_ID = 1;

/// Public mainnet endpoints, tried in order. No keys, no accounts, read-only.
export const RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com',
  'https://eth.drpc.org',
  'https://rpc.flashbots.net',
] as const;

/// Blocks left unread at the tip, so a reorg never reaches the archive.
export const CONFIRMATIONS = 12;
/// Upper bound on a single eth_getLogs page; halved on failure, grown back on success.
export const MAX_RANGE = 1_000n;

export interface Config { contractAddress: Address; deployBlock: number }

export function config(): Config {
  // The workflow injects the two Repository variables into the sync process. Nothing else is read.
  const address = (process.env.CONTRACT_ADDRESS ?? '').trim();
  const block = (process.env.DEPLOY_BLOCK ?? '').trim();
  if (!isAddress(address, { strict: false }) || /^0x0+$/i.test(address)) {
    throw new Error('Set the CONTRACT_ADDRESS Repository variable to the deployed VRL token address.');
  }
  if (!/^[1-9]\d*$/.test(block) || !Number.isSafeInteger(Number(block))) {
    throw new Error('The DEPLOY_BLOCK Repository variable must be a positive integer; scanning from block 0 is forbidden.');
  }
  return { contractAddress: getAddress(address.toLowerCase()), deployBlock: Number(block) };
}

import { createPublicClient, http } from 'viem';
import type { Address, PublicClient } from 'viem';
import { CONFIRMATIONS, MAX_RANGE, RPCS } from './config.ts';
import { compareEvents, decode } from './decoder.ts';
import type { RawLog, ViralEvent } from './decoder.ts';

export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const clients: PublicClient[] = RPCS.map(url =>
  createPublicClient({ transport: http(url, { timeout: 20_000, retryCount: 0 }) }) as PublicClient);

/// Index of the endpoint currently believed healthy. Rotates only on failure, so a working
/// endpoint keeps serving the whole run and the shared hosts are not sprayed with traffic.
let current = 0;

export function endpoint(): string { return RPCS[current]; }

/// Returns to the head of the list. Used by tests; a sync run never needs it.
export function resetFailover(): void { current = 0; }

/// Runs `read` against the active endpoint, rotating to the next one on failure. Every endpoint
/// gets a turn before the round is considered lost; then it backs off and starts another round.
export async function withFailover<T>(
  read: (client: PublicClient) => Promise<T>,
  rounds = 3,
  sleep = delay,
): Promise<T> {
  let last: unknown;
  for (let round = 0; round < rounds; round++) {
    for (let tried = 0; tried < clients.length; tried++) {
      try { return await read(clients[current]); }
      catch (error) {
        last = error;
        current = (current + 1) % clients.length;
      }
    }
    await sleep(500 * 2 ** round);
  }
  throw new Error(`All ${RPCS.length} public endpoints failed`, { cause: last });
}

/// The newest block safe to archive: the tip minus the confirmation depth.
export async function confirmedHead(): Promise<bigint> {
  const tip = await withFailover(client => client.getBlockNumber());
  const head = tip - BigInt(CONFIRMATIONS);
  return head > 0n ? head : 0n;
}

export type LogReader = (client: PublicClient, from: bigint, to: bigint) => Promise<RawLog[]>;

const readLogs = (address: Address): LogReader =>
  (client, from, to) => client.getLogs({ address, fromBlock: from, toBlock: to }) as Promise<RawLog[]>;

/// Yields one sorted page of decoded events at a time. Pages are bounded and requested
/// sequentially; a page that no endpoint can serve is halved before being retried, so a range
/// holding too many logs narrows instead of failing the run.
export async function* eventPages(
  address: Address,
  from: bigint,
  to: bigint,
  reader: LogReader = readLogs(address),
  sleep = delay,
): AsyncGenerator<ViralEvent[]> {
  if (from <= 0n) throw new Error('Refusing to scan from block 0');
  let width = MAX_RANGE;
  while (from <= to) {
    const end = from + width - 1n < to ? from + width - 1n : to;
    let logs: RawLog[];
    try {
      // One round only: a page an endpoint refuses is usually too wide, not a dead host, and
      // halving it is cheaper than asking every endpoint the same oversized question.
      logs = await withFailover(client => reader(client, from, end), 1, sleep);
    } catch (error) {
      if (end === from) throw new Error(`Public RPCs failed at block ${from}; no progress published`, { cause: error });
      width = width / 2n || 1n;
      continue;
    }
    const events: ViralEvent[] = [];
    for (const log of logs) {
      if (log.blockNumber === null || log.blockNumber < from || log.blockNumber > end) {
        throw new Error('RPC returned a log outside the requested range');
      }
      const event = decode(log);
      if (event) events.push(event);
    }
    events.sort(compareEvents);
    for (let i = 1; i < events.length; i++) {
      if (compareEvents(events[i - 1], events[i]) === 0) throw new Error('RPC returned duplicate logs');
    }
    yield events;
    from = end + 1n;
    width = width < MAX_RANGE ? (width * 2n > MAX_RANGE ? MAX_RANGE : width * 2n) : width;
    await sleep(150);
  }
}

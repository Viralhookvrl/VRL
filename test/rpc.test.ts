import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { eventPages, resetFailover, withFailover } from '../src/rpc.ts';
import { RPCS } from '../src/config.ts';
import type { LogReader } from '../src/rpc.ts';
import type { RawLog } from '../src/decoder.ts';
import { CONTRACT, address, infection, mutation } from './fixture.ts';

const nap = async (): Promise<void> => {};

beforeEach(resetFailover);

test('failover moves to the next endpoint and returns the first success', async () => {
  let calls = 0;
  const value = await withFailover(async () => {
    calls++;
    if (calls < 3) throw new Error('endpoint down');
    return 'ok';
  }, 3, nap);
  assert.equal(value, 'ok');
  assert.equal(calls, 3);
});

test('failover gives up only after every endpoint has been tried', async () => {
  let calls = 0;
  await assert.rejects(
    withFailover(async () => { calls++; throw new Error('down'); }, 2, nap),
    /public endpoints failed/);
  assert.ok(calls >= 6, `tried ${calls} times`);
});

test('pages arrive sorted and cover the range exactly once', async () => {
  const logs: RawLog[] = [
    infection(address(1), address(2), 1_500, 2),
    mutation(1, 1, 1_000, 0),
    mutation(2, 2, 2_400, 1),
  ];
  const seen: [bigint, bigint][] = [];
  const reader: LogReader = async (_client, from, to) => {
    seen.push([from, to]);
    return logs.filter(entry => entry.blockNumber! >= from && entry.blockNumber! <= to);
  };
  const events = [];
  for await (const page of eventPages(CONTRACT, 1_000n, 2_400n, reader, nap)) events.push(...page);
  assert.deepEqual(events.map(event => event.block), [1_000, 1_500, 2_400]);
  assert.deepEqual(seen, [[1_000n, 1_999n], [2_000n, 2_400n]]);
});

test('a failing page is halved rather than abandoned', async () => {
  const widths: bigint[] = [];
  const reader: LogReader = async (_client, from, to) => {
    widths.push(to - from + 1n);
    if (to - from + 1n > 125n) throw new Error('too many results');
    return [];
  };
  for await (const _page of eventPages(CONTRACT, 1n, 250n, reader, nap)) void _page;
  // The oversized page is offered to every endpoint before the range narrows, and the scan
  // finishes only once every block has been served by a page small enough to succeed.
  assert.ok(widths.includes(250n), 'the full range was tried first');
  assert.ok(widths.some(width => width < 250n), `never narrowed: ${widths}`);
  assert.ok(widths.filter(width => width === 250n).length >= RPCS.length,
    'every endpoint saw the oversized range');
  const served = widths.filter(width => width <= 125n);
  assert.equal(served.reduce((sum, width) => sum + width, 0n), 250n,
    'the narrowed pages cover the range exactly once');
});

test('a log outside the requested window is rejected', async () => {
  const reader: LogReader = async () => [mutation(1, 1, 99_999)];
  await assert.rejects(async () => {
    for await (const _page of eventPages(CONTRACT, 1n, 100n, reader, nap)) void _page;
  }, /outside the requested range/);
});

test('duplicate logs from an endpoint are rejected', async () => {
  const reader: LogReader = async () => [mutation(1, 1, 50), mutation(1, 1, 50)];
  await assert.rejects(async () => {
    for await (const _page of eventPages(CONTRACT, 1n, 100n, reader, nap)) void _page;
  }, /duplicate logs/);
});

test('scanning from block 0 is refused', async () => {
  await assert.rejects(async () => {
    for await (const _page of eventPages(CONTRACT, 0n, 10n, async () => [], nap)) void _page;
  }, /block 0/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode } from '../src/decoder.ts';
import { Outbreak, hostState } from '../src/state.ts';
import type { InfectionRecord } from '../src/state.ts';
import { address, infection, mutation } from './fixture.ts';

const apply = (outbreak: Outbreak, ...logs: ReturnType<typeof mutation>[]): void => {
  for (const raw of logs) outbreak.apply(decode(raw)!);
};

test('a mutation advances the revision and archives the previous genome', () => {
  const outbreak = new Outbreak();
  apply(outbreak, mutation(1, 10, 100), mutation(2, 11, 101));
  assert.equal(outbreak.revision, 2);
  assert.equal(outbreak.eligibleSwapCount, 11);
  assert.equal(outbreak.mutations.length, 2);
  assert.equal(outbreak.mutations[1].previousGenome, outbreak.mutations[0].newGenome);
});

test('a revision gap is refused rather than silently accepted', () => {
  const outbreak = new Outbreak();
  apply(outbreak, mutation(1, 1, 100));
  assert.throws(() => apply(outbreak, mutation(3, 3, 102)), /Missing genome revision 2/);
});

test('an infection creates a host record and an immutable transmission', () => {
  const outbreak = new Outbreak();
  apply(outbreak, infection(address(1), address(2), 100, 0));
  assert.equal(outbreak.totalTransmissions, 1);
  assert.equal(outbreak.transmissions.length, 1);
  const record = outbreak.infections.get(address(1))!;
  assert.equal(record.status, 'INFECTED');
  assert.equal(record.infector, address(2));
  assert.equal(record.immuneUntilSwap, 128 + 32);
});

test('re-infection overwrites the host file but keeps both transmissions', () => {
  const outbreak = new Outbreak();
  apply(outbreak,
    infection(address(1), address(2), 100, 0),
    infection(address(1), address(3), 300, 1, { expires: 400 }));
  assert.equal(outbreak.infections.size, 1);
  assert.equal(outbreak.infections.get(address(1))!.infector, address(3));
  assert.equal(outbreak.transmissions.length, 2);
  assert.equal(outbreak.totalTransmissions, 2);
});

test('an out-of-order or repeated event is rejected', () => {
  const outbreak = new Outbreak();
  apply(outbreak, mutation(1, 1, 200));
  assert.throws(() => apply(outbreak, mutation(2, 2, 100)), /out-of-order/);
  const outbreak2 = new Outbreak();
  const raw = mutation(1, 1, 200);
  outbreak2.apply(decode(raw)!);
  assert.throws(() => outbreak2.apply(decode(raw)!), /Duplicate/);
});

test('status follows the swap counter with no event of its own', () => {
  const record = { expirySwap: 128 } as InfectionRecord;
  assert.equal(hostState(record, 127), 'INFECTED');
  assert.equal(hostState(record, 128), 'IMMUNE');
  assert.equal(hostState(record, 159), 'IMMUNE');
  assert.equal(hostState(record, 160), 'CLEAN');
});

test('refreshing statuses reports exactly the hosts that moved', () => {
  const outbreak = new Outbreak();
  apply(outbreak, infection(address(1), address(2), 100, 0, { expires: 50 }));
  outbreak.eligibleSwapCount = 49;
  assert.deepEqual(outbreak.refreshStatuses(), []);
  outbreak.eligibleSwapCount = 50;
  assert.deepEqual(outbreak.refreshStatuses(), [address(1)]);
  assert.equal(outbreak.counts().immuneHosts, 1);
  assert.equal(outbreak.counts().activeHosts, 0);
  outbreak.eligibleSwapCount = 82;
  assert.deepEqual(outbreak.refreshStatuses(), [address(1)]);
  assert.deepEqual(outbreak.counts(), { activeHosts: 0, immuneHosts: 0 });
});

test('the published state carries the live counters', () => {
  const outbreak = new Outbreak();
  apply(outbreak, mutation(1, 5, 100), infection(address(1), address(2), 101, 0));
  const state = outbreak.state(101);
  assert.equal(state.lastProcessedBlock, 101);
  assert.equal(state.revision, 1);
  assert.equal(state.activeHosts, 1);
  assert.equal(state.totalTransmissions, 1);
  assert.match(state.strainCode, /^VRL-/);
});

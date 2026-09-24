import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAddress } from 'viem';
import { decode, compareEvents, displayStrain, normalize, safeNumber } from '../src/decoder.ts';
import { address, infection, mutation, strain, log } from './fixture.ts';

test('decodes a genome mutation', () => {
  const event = decode(mutation(7, 900, 21_000_100))!;
  assert.equal(event.type, 'MUTATION');
  assert.equal(event.revision, 7);
  assert.equal(event.eligibleSwapCount, 900);
  assert.equal(event.genome, strain(7));
});

test('decodes an infection with a checksummed host', () => {
  const event = decode(infection(address(1), address(2), 21_000_200, 3))!;
  assert.equal(event.type, 'INFECTION');
  assert.equal(event.host, address(1));
  assert.equal(event.infector, address(2));
  assert.equal(event.generation, 1);
  assert.equal(event.rewardCutBps, 500);
  assert.equal(event.expiresAtSwap, 128);
});

test('ignores logs from unknown topics', () => {
  const raw = mutation(1, 1, 21_000_000);
  assert.equal(decode({ ...raw, topics: ['0x' + 'ab'.repeat(32)] as never }), null);
});

test('refuses a removed or unconfirmed log', () => {
  assert.throws(() => decode({ ...mutation(1, 1, 21_000_000), removed: true }), /Unconfirmed or removed/);
  assert.throws(() => decode({ ...mutation(1, 1, 21_000_000), blockNumber: null }), /Unconfirmed or removed/);
});

test('orders events by block, then transaction, then log index', () => {
  const a = decode(mutation(1, 1, 100, 5))!;
  const b = decode(mutation(2, 2, 100, 6))!;
  const c = decode(mutation(3, 3, 101, 0))!;
  assert.ok(compareEvents(a, b) < 0);
  assert.ok(compareEvents(b, c) < 0);
  assert.equal(compareEvents(a, a), 0);
});

test('derives a stable display strain', () => {
  assert.match(displayStrain(strain(1)), /^VRL-[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(displayStrain(strain(1)), displayStrain(strain(1)));
});

test('rejects unsafe integers', () => {
  assert.throws(() => safeNumber(2n ** 64n), /Unsafe integer/);
});

test('decodes a payout and a lapse', () => {
  const payout = decode(log('Payout', {
    account: address(1), net: 5n, infectionCut: 1n, infector: address(2), windowId: 3n,
  }, 200, 0))!;
  assert.equal(payout.type, 'PAYOUT');
  assert.equal(payout.net, '5');
  const lapse = decode(log('TrancheLapsed', { account: address(1), amount: 9n, firstWindow: 2n }, 201, 0))!;
  assert.equal(lapse.type, 'LAPSE');
  assert.equal(lapse.amount, '9');
});

/// Filenames are derived from these, so a host must decode to one canonical spelling no matter
/// how the endpoint cased the topic it came from.
test('addresses decode to their canonical EIP-55 spelling', () => {
  const event = decode(infection(address(0xa1), address(0xb2), 100, 0))!;
  assert.equal(event.host, getAddress(event.host!.toLowerCase()));
  assert.equal(event.infector, getAddress(event.infector!.toLowerCase()));
});

test('normalizing is idempotent and case-insensitive', () => {
  const canonical = normalize('0x2a9f3c19e1b5c3f4b8d6a7e0c1d2b3a4f5e6d7c8');
  assert.equal(normalize(canonical), canonical);
  assert.equal(normalize(canonical.toUpperCase().replace('0X', '0x')), canonical);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decode } from '../src/decoder.ts';
import { Outbreak } from '../src/state.ts';
import { addressFile, loadCheckpoint, publish, readJson, transmissionFile } from '../src/storage.ts';
import type { Checkpoint } from '../src/storage.ts';
import type { RawLog } from '../src/decoder.ts';
import { address, infection, mutation, sandbox, settings } from './fixture.ts';

const B = settings.deployBlock;

/// A miniature chain, replayed through the same resume path the workflow uses: load the
/// checkpoint, fold in only the blocks after it, publish.
function run(root: string, chain: RawLog[], head: number): void {
  const loaded = loadCheckpoint(root, settings);
  const outbreak = loaded?.outbreak ?? new Outbreak();
  const from = loaded ? loaded.checkpoint.lastProcessedBlock + 1 : settings.deployBlock;
  for (const raw of chain) {
    const event = decode(raw)!;
    if (event.block >= from && event.block <= head) outbreak.apply(event);
  }
  const changed = new Set(outbreak.touched);
  for (const host of outbreak.refreshStatuses()) changed.add(host);
  publish(root, settings, outbreak, head, null, changed);
}

const chain: RawLog[] = [
  mutation(1, 10, B + 1),
  infection(address(1), address(2), B + 2, 0, { created: 10, expires: 40 }),
  mutation(2, 20, B + 3),
  infection(address(3), address(1), B + 4, 1, { created: 20, expires: 60, generation: 2 }),
  mutation(3, 45, B + 5),
];

test('a resumed sync adds only new events and never duplicates', () => {
  const { root, cleanup } = sandbox();
  try {
    run(root, chain, B + 3);
    const first = readJson<Checkpoint>(join(root, 'live/state.json'));
    assert.equal(first.revision, 2);
    assert.equal(first.totalTransmissions, 1);

    run(root, chain, B + 5);
    const second = readJson<Checkpoint>(join(root, 'live/state.json'));
    assert.equal(second.revision, 3);
    assert.equal(second.totalTransmissions, 2);
    assert.equal(readdirSync(join(root, 'mutations')).length, 3);
    assert.equal(readdirSync(join(root, 'transmissions')).length, 2);
  } finally { cleanup(); }
});

test('running the same head twice changes nothing on disk', () => {
  const { root, cleanup } = sandbox();
  try {
    run(root, chain, B + 5);
    const snapshot = (): Record<string, string> => Object.fromEntries(
      ['mutations', 'transmissions', 'infections'].flatMap(dir =>
        readdirSync(join(root, dir)).map(name =>
          [`${dir}/${name}`, readFileSync(join(root, dir, name), 'utf8')])));
    const before = snapshot();
    run(root, chain, B + 5);
    assert.deepEqual(snapshot(), before);
    const state = readJson<Checkpoint>(join(root, 'live/state.json'));
    assert.equal(state.totalTransmissions, 2);
    assert.equal(state.revision, 3);
  } finally { cleanup(); }
});

test('a host expires without any event, purely from the swap counter', () => {
  const { root, cleanup } = sandbox();
  try {
    run(root, chain, B + 3);
    assert.equal(
      readJson<{ status: string }>(join(root, 'infections', addressFile(address(1)))).status, 'INFECTED');

    // Revision 3 carries the swap count past host 1's expiry at swap 40.
    run(root, chain, B + 5);
    assert.equal(
      readJson<{ status: string }>(join(root, 'infections', addressFile(address(1)))).status, 'IMMUNE');
    assert.equal(
      readJson<{ status: string }>(join(root, 'infections', addressFile(address(3)))).status, 'INFECTED');
    const state = readJson<Checkpoint>(join(root, 'live/state.json'));
    assert.equal(state.activeHosts, 1);
    assert.equal(state.immuneHosts, 1);
  } finally { cleanup(); }
});

test('archived mutations and transmissions are never rewritten', () => {
  const { root, cleanup } = sandbox();
  try {
    run(root, chain, B + 3);
    const mutationPath = join(root, 'mutations/000001.json');
    const transmissionPath = join(root, 'transmissions', transmissionFile(B + 2, 0));
    const before = [readFileSync(mutationPath, 'utf8'), readFileSync(transmissionPath, 'utf8')];
    run(root, chain, B + 5);
    assert.equal(readFileSync(mutationPath, 'utf8'), before[0]);
    assert.equal(readFileSync(transmissionPath, 'utf8'), before[1]);
  } finally { cleanup(); }
});

test('a hand-edited archive stops the next run instead of being papered over', () => {
  const { root, cleanup } = sandbox();
  try {
    run(root, chain, B + 5);
    writeFileSync(join(root, 'infections', addressFile(address(1))),
      JSON.stringify({ host: address(1), status: 'SUPERHOST' }));
    assert.throws(() => loadCheckpoint(root, settings), /unknown status/);
  } finally { cleanup(); }
});

test('nothing is left staged after a successful run', () => {
  const { root, cleanup } = sandbox();
  try {
    run(root, chain, B + 5);
    assert.ok(!existsSync(join(root, '.stage')));
  } finally { cleanup(); }
});

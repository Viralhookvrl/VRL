import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decode } from '../src/decoder.ts';
import { Outbreak } from '../src/state.ts';
import {
  addressFile, loadCheckpoint, mutationFile, publish, recover, transmissionFile, writeJson, readJson,
} from '../src/storage.ts';
import type { Checkpoint } from '../src/storage.ts';
import { address, infection, mutation, sandbox, settings } from './fixture.ts';

const BLOCK = settings.deployBlock;

const build = (root: string): Outbreak => {
  for (const name of ['live', 'infections', 'mutations', 'transmissions']) mkdirSync(join(root, name), { recursive: true });
  const outbreak = new Outbreak();
  for (const raw of [mutation(1, 10, BLOCK), infection(address(1), address(2), BLOCK + 1, 0)]) outbreak.apply(decode(raw)!);
  return outbreak;
};

test('a filename is only ever derived from a valid address', () => {
  assert.equal(addressFile(address(1)), `${address(1).toLowerCase()}.json`);
  for (const bad of ['../../etc/passwd', '0xnope', '', 'live/state.json']) {
    assert.throws(() => addressFile(bad), /Refusing to derive a filename/);
  }
});

test('archive filenames sort in chain order', () => {
  assert.equal(mutationFile(12), '000012.json');
  assert.equal(transmissionFile(21_000_000, 7), '021000000-0007.json');
  assert.ok(transmissionFile(100, 2) < transmissionFile(100, 10));
  assert.ok(transmissionFile(99, 9) < transmissionFile(100, 0));
});

test('json is written deterministically and ends in a newline', () => {
  const { root, cleanup } = sandbox();
  try {
    writeJson(join(root, 'a.json'), { b: 1, a: 2 });
    writeJson(join(root, 'b.json'), { b: 1, a: 2 });
    const text = readFileSync(join(root, 'a.json'), 'utf8');
    assert.equal(text, readFileSync(join(root, 'b.json'), 'utf8'));
    assert.ok(text.endsWith('\n'));
  } finally { cleanup(); }
});

test('publish writes the live state and both archives', () => {
  const { root, cleanup } = sandbox();
  try {
    const outbreak = build(root);
    publish(root, settings, outbreak, BLOCK + 1, null, outbreak.touched);
    assert.ok(existsSync(join(root, 'mutations/000001.json')));
    assert.ok(existsSync(join(root, 'transmissions', transmissionFile(BLOCK + 1, 0))));
    assert.ok(existsSync(join(root, 'infections', addressFile(address(1)))));
    const state = readJson<Checkpoint>(join(root, 'live/state.json'));
    assert.equal(state.lastProcessedBlock, BLOCK + 1);
    assert.equal(state.activeHosts, 1);
    assert.equal(state.totalTransmissions, 1);
    const outbreakFile = readJson<{ recentTransmissions: unknown[]; topInfectors: { address: string }[] }>(
      join(root, 'live/outbreak.json'));
    assert.equal(outbreakFile.recentTransmissions.length, 1);
    assert.equal(outbreakFile.topInfectors[0].address, address(2));
    assert.ok(existsSync(join(root, 'live/genome.json')));
  } finally { cleanup(); }
});

test('a checkpoint round-trips and resumes past the last processed block', () => {
  const { root, cleanup } = sandbox();
  try {
    const outbreak = build(root);
    publish(root, settings, outbreak, BLOCK + 1, null, outbreak.touched);
    const loaded = loadCheckpoint(root, settings)!;
    assert.equal(loaded.checkpoint.lastProcessedBlock, BLOCK + 1);
    assert.equal(loaded.outbreak.revision, 1);
    assert.equal(loaded.outbreak.totalTransmissions, 1);
    assert.equal(loaded.outbreak.infections.get(address(1))!.infector, address(2));
    assert.equal(loaded.outbreak.mutations.length, 0, 'resumed runs re-archive nothing');
  } finally { cleanup(); }
});

test('a changed contract address or deploy block stops the run', () => {
  const { root, cleanup } = sandbox();
  try {
    const outbreak = build(root);
    publish(root, settings, outbreak, BLOCK + 1, null, outbreak.touched);
    assert.throws(() => loadCheckpoint(root, { ...settings, deployBlock: settings.deployBlock + 1 }),
      /CONTRACT_ADDRESS or DEPLOY_BLOCK changed/);
    assert.throws(() => loadCheckpoint(root, { ...settings, contractAddress: address(9) }),
      /CONTRACT_ADDRESS or DEPLOY_BLOCK changed/);
  } finally { cleanup(); }
});

test('a missing archive file is detected instead of being re-created', () => {
  const { root, cleanup } = sandbox();
  try {
    const outbreak = build(root);
    publish(root, settings, outbreak, BLOCK + 1, null, outbreak.touched);
    writeFileSync(join(root, 'mutations/000001.json'), '');
    assert.throws(() => loadCheckpoint(root, settings));
  } finally { cleanup(); }
});

test('an unconfigured placeholder is treated as no checkpoint', () => {
  const { root, cleanup } = sandbox();
  try {
    mkdirSync(join(root, 'live'), { recursive: true });
    writeJson(join(root, 'live/state.json'), { status: 'UNCONFIGURED' });
    assert.equal(loadCheckpoint(root, settings), null);
  } finally { cleanup(); }
});

test('an interrupted publish rolls back to the previous archive', () => {
  const { root, cleanup } = sandbox();
  try {
    const outbreak = build(root);
    publish(root, settings, outbreak, BLOCK + 1, null, outbreak.touched);
    const before = readFileSync(join(root, 'live/state.json'), 'utf8');

    // A second publish that collides with an already-archived mutation must leave nothing behind.
    const replay = new Outbreak();
    replay.apply(decode(mutation(1, 10, BLOCK))!);
    assert.throws(() => publish(root, settings, replay, BLOCK + 100, null, []), /already archived/);
    assert.equal(readFileSync(join(root, 'live/state.json'), 'utf8'), before);
    assert.ok(!existsSync(join(root, '.stage')));
    assert.ok(existsSync(join(root, 'transmissions', transmissionFile(BLOCK + 1, 0))));
  } finally { cleanup(); }
});

test('recover is a no-op without a staged run', () => {
  const { root, cleanup } = sandbox();
  try {
    recover(root);
    assert.ok(!existsSync(join(root, '.stage')));
  } finally { cleanup(); }
});

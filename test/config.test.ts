import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIRMATIONS, RPCS, config } from '../src/config.ts';
import { address } from './fixture.ts';

const withEnv = (contract: string | undefined, block: string | undefined, run: () => void): void => {
  const before = { c: process.env.CONTRACT_ADDRESS, d: process.env.DEPLOY_BLOCK };
  if (contract === undefined) delete process.env.CONTRACT_ADDRESS; else process.env.CONTRACT_ADDRESS = contract;
  if (block === undefined) delete process.env.DEPLOY_BLOCK; else process.env.DEPLOY_BLOCK = block;
  try { run(); } finally {
    if (before.c === undefined) delete process.env.CONTRACT_ADDRESS; else process.env.CONTRACT_ADDRESS = before.c;
    if (before.d === undefined) delete process.env.DEPLOY_BLOCK; else process.env.DEPLOY_BLOCK = before.d;
  }
};

test('every endpoint is a hardcoded public https url with no key in it', () => {
  assert.ok(RPCS.length >= 3);
  for (const url of RPCS) {
    assert.ok(url.startsWith('https://'), url);
    assert.ok(!/[?#]/.test(url), `${url} carries a query string`);
    assert.ok(!/[0-9a-f]{32}/i.test(url), `${url} looks like it embeds a key`);
  }
  assert.equal(new Set(RPCS).size, RPCS.length, 'endpoints are unique');
});

test('only the two documented variables are read', () => {
  const source = readdirSync('src')
    .filter(name => name.endsWith('.ts'))
    .map(name => readFileSync(join('src', name), 'utf8')).join('\n');
  const referenced = [...source.matchAll(/process\.env\.([A-Z_]+)/g)].map(match => match[1]);
  assert.deepEqual([...new Set(referenced)].sort(), ['CONTRACT_ADDRESS', 'DEPLOY_BLOCK']);
});

test('a valid configuration is checksummed', () => {
  withEnv(address(1).toLowerCase(), '21000000', () => {
    assert.deepEqual(config(), { contractAddress: address(1), deployBlock: 21_000_000 });
  });
});

test('a missing, zero or malformed address is refused', () => {
  for (const bad of [undefined, '', '0xnope', `0x${'0'.repeat(40)}`]) {
    withEnv(bad, '21000000', () => assert.throws(config, /CONTRACT_ADDRESS/));
  }
});

test('a non-positive or malformed deploy block is refused', () => {
  for (const bad of [undefined, '', '0', '-1', '1.5', 'latest']) {
    withEnv(address(1), bad, () => assert.throws(config, /DEPLOY_BLOCK/));
  }
});

test('the confirmation delay keeps the archive behind the tip', () => {
  assert.ok(CONFIRMATIONS >= 12);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIVE_END, LIVE_START, assertReadmeMarkers, liveSection, renderReadme } from '../src/readme.ts';
import { writeJson } from '../src/storage.ts';
import { sandbox, settings } from './fixture.ts';

const TEMPLATE = `![VIRAL](viralban.png)\n\n# VIRAL\n\nintro\n\n${LIVE_START}\n\nold\n\n${LIVE_END}\n\ntail\n`;

const SYNCED = {
  schemaVersion: 1, chainId: 1, contractAddress: settings.contractAddress,
  deployBlock: settings.deployBlock, strainCode: 'VRL-AB12-CD34', revision: 9,
  genome: `0xab12cd34${'0'.repeat(56)}`, activeHosts: 4, immuneHosts: 2,
  totalTransmissions: 11, eligibleSwapCount: 900, lastProcessedBlock: 24_599_184,
  hook: null, lastProcessedBlockHash: null, updatedAt: '2026-01-01T00:00:00.000Z',
};

const seed = (root: string, state: unknown, summary?: unknown): void => {
  mkdirSync(join(root, 'live'), { recursive: true });
  for (const name of ['infections', 'mutations', 'transmissions']) mkdirSync(join(root, name), { recursive: true });
  writeJson(join(root, 'live/state.json'), state);
  if (summary) writeJson(join(root, 'live/outbreak.json'), summary);
  writeFileSync(join(root, 'README.md'), TEMPLATE);
};

test('an empty archive renders as art alone, with no commentary', () => {
  const { root, cleanup } = sandbox();
  try {
    seed(root, { status: 'UNCONFIGURED' });
    const section = liveSection(root);
    assert.match(section, /no strain/);
    assert.match(section, /no hosts/);
    // The live section never explains the setup, and never speculates about the contract.
    assert.doesNotMatch(section,
      /CONTRACT_ADDRESS|DEPLOY_BLOCK|Repository variables|workflow|deploy|sync|dormant|yet/i);
  } finally { cleanup(); }
});

test('a synced mirror shows strain, revision, hosts and transmissions', () => {
  const { root, cleanup } = sandbox();
  try {
    seed(root, SYNCED);
    const section = liveSection(root);
    assert.match(section, /VRL-AB12-CD34/);
    assert.match(section, /\| Revision \| \[9\]\(mutations\/\) \|/);
    assert.match(section, /\| Active hosts \| 4 \|/);
    assert.match(section, /\| Immune hosts \| 2 \|/);
    assert.match(section, /\| Total transmissions \| \[11\]\(transmissions\/\) \|/);
    assert.match(section, /etherscan\.io\/block\/24599184/);
    assert.match(section, new RegExp(`etherscan\\.io/address/${settings.contractAddress}`));
  } finally { cleanup(); }
});

test('recent transmissions and top infectors are rendered as tables', () => {
  const { root, cleanup } = sandbox();
  try {
    seed(root, SYNCED, {
      block: 24_599_184, revision: 9, strainCode: 'VRL-AB12-CD34',
      activeHosts: 4, immuneHosts: 2, cleanedHosts: 0, totalTransmissions: 11, eligibleSwapCount: 900,
      topInfectors: [{ address: '0x00000000000000000000000000000000000000b2', infections: 3 }],
      recentTransmissions: [{
        source: '0x00000000000000000000000000000000000000b2',
        host: '0x00000000000000000000000000000000000000A1',
        strainCode: `0x${'11'.repeat(32)}`, displayStrain: 'VRL-1111-1111',
        generation: 2, rewardCutBps: 660, block: 24_599_100, logIndex: 4,
        tx: `0x${'22'.repeat(32)}`,
      }],
    });
    const section = liveSection(root);
    assert.match(section, /### Recent transmissions/);
    assert.match(section, /### Most transmissions caused/);
    assert.match(section, /VRL-1111-1111/);
    assert.match(section, /6\.60%/, 'the reward cut is shown as a percentage');
    assert.match(section, /0x0000…00b2/, 'addresses are shortened but linked');
  } finally { cleanup(); }
});

test('rendering replaces only the marked block and is idempotent', () => {
  const { root, cleanup } = sandbox();
  try {
    seed(root, SYNCED);
    assert.equal(renderReadme(root), true, 'the first render changes the file');
    const once = readFileSync(join(root, 'README.md'), 'utf8');
    assert.equal(renderReadme(root), false, 'a second render reports no change');
    assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), once);
    assert.match(once, /^!\[VIRAL\]\(viralban\.png\)/);
    assert.match(once, /intro/);
    assert.match(once, /tail\n$/);
    assert.doesNotMatch(once, /\bold\b/);
  } finally { cleanup(); }
});

test('a README without a marker pair is refused rather than silently skipped', () => {
  const { root, cleanup } = sandbox();
  try {
    seed(root, SYNCED);
    writeFileSync(join(root, 'README.md'), '# VIRAL\n\nno markers\n');
    assert.throws(() => renderReadme(root), /one VIRAL LIVE marker pair/);
    writeFileSync(join(root, 'README.md'), `${LIVE_START}\n${LIVE_END}\n${LIVE_START}\n${LIVE_END}\n`);
    assert.throws(() => renderReadme(root), /one VIRAL LIVE marker pair/);
  } finally { cleanup(); }
});

test('an unsupported checkpoint schema is refused', () => {
  const { root, cleanup } = sandbox();
  try {
    seed(root, { ...SYNCED, schemaVersion: 2 });
    assert.throws(() => liveSection(root), /unsupported live checkpoint/);
  } finally { cleanup(); }
});

test('the marker check runs before any work and reports the file', () => {
  const { root, cleanup } = sandbox();
  try {
    assert.throws(() => assertReadmeMarkers(root), /README\.md is missing/);
    writeFileSync(join(root, 'README.md'), TEMPLATE);
    const found = assertReadmeMarkers(root);
    assert.ok(found.start < found.end);
    assert.equal(found.text.slice(found.start, found.start + LIVE_START.length), LIVE_START);
  } finally { cleanup(); }
});

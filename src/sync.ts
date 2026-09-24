import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Hex } from 'viem';
import { ROOT, config } from './config.ts';
import type { Config } from './config.ts';
import { confirmedHead, endpoint, eventPages, withFailover } from './rpc.ts';
import { Outbreak } from './state.ts';
import { loadCheckpoint, publish, recover, unconfigured, writeJson } from './storage.ts';
import { assertReadmeMarkers, renderReadme } from './readme.ts';

/// One pass over the confirmed chain: resume from the checkpoint, fold in whatever is new, and
/// publish. Running it twice in a row is a no-op, because the second run starts where the first
/// one stopped and re-reads nothing.
export async function sync(root = ROOT, settings: Config = config()): Promise<void> {
  recover(root);
  for (const name of ['live', 'infections', 'mutations', 'transmissions']) {
    mkdirSync(join(root, name), { recursive: true });
  }

  // The README is checked before any network work, so a broken marker pair fails the run up
  // front rather than after a perfectly good archive has already been published.
  assertReadmeMarkers(root);

  const loaded = loadCheckpoint(root, settings);
  const outbreak = loaded?.outbreak ?? new Outbreak();
  const from = loaded ? BigInt(loaded.checkpoint.lastProcessedBlock + 1) : BigInt(settings.deployBlock);

  const head = await confirmedHead();
  if (head < from) {
    console.log(`viral: nothing new; confirmed head ${head} is behind block ${from}`);
    if (!loaded) writeJson(join(root, 'live/state.json'), unconfigured());
    renderReadme(root);
    return;
  }

  console.log(`viral: scanning ${from} → ${head} via ${endpoint()}`);
  let events = 0;
  for await (const page of eventPages(settings.contractAddress, from, head)) {
    for (const event of page) { outbreak.apply(event); events++; }
  }

  // Expiry and immunity are never announced on-chain, so statuses are re-derived every run, even
  // when no log arrived: the swap counter alone can move a host INFECTED → IMMUNE → CLEAN.
  const changed = new Set(outbreak.touched);
  for (const host of outbreak.refreshStatuses()) changed.add(host);

  const block = Number(head);
  const blockHash = await withFailover(client => client.getBlock({ blockNumber: head }))
    .then(b => b.hash as Hex).catch(() => null);

  publish(root, settings, outbreak, block, blockHash, changed);
  renderReadme(root);

  console.log(
    `viral: block ${block} · ${events} events · revision ${outbreak.revision} · `
    + `${outbreak.counts().activeHosts} active · ${outbreak.totalTransmissions} transmissions`,
  );
}

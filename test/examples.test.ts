import { test } from 'node:test';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { decode } from '../src/decoder.ts';
import { ROOT } from '../src/config.ts';
import { Outbreak } from '../src/state.ts';
import { publish } from '../src/storage.ts';
import type { Config } from '../src/config.ts';
import { address, infection, mutation, sandbox } from './fixture.ts';
import { getAddress } from 'viem';

/// Regenerates examples/ from the real pipeline, so the samples can never drift from the code
/// that produces them. Run with GENERATE_EXAMPLES=1.
test('examples', { skip: process.env.GENERATE_EXAMPLES !== '1' }, () => {
  const { root, cleanup } = sandbox();
  try {
    const settings: Config = {
      contractAddress: getAddress('0x2a9f3c19e1b5c3f4b8d6a7e0c1d2b3a4f5e6d7c8'),
      deployBlock: 24_598_000,
    };
    const B = settings.deployBlock;
    for (const name of ['live', 'infections', 'mutations', 'transmissions']) {
      mkdirSync(join(root, name), { recursive: true });
    }
    const outbreak = new Outbreak();
    const chain = [
      mutation(1, 1, B + 12),
      mutation(2, 2, B + 40),
      infection(address(0xa1), address(0xb2), B + 41, 3,
        { created: 2, expires: 158, generation: 1, cut: 420 }),
      mutation(3, 3, B + 77),
      infection(address(0xc3), address(0xa1), B + 90, 1,
        { created: 3, expires: 187, generation: 2, cut: 660 }),
      mutation(4, 4, B + 120),
    ];
    for (const raw of chain) outbreak.apply(decode(raw)!);
    const changed = new Set(outbreak.touched);
    for (const host of outbreak.refreshStatuses()) changed.add(host);
    publish(root, settings, outbreak, B + 184,
      '0x9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5', changed);

    const examples = join(ROOT, 'examples');
    rmSync(examples, { recursive: true, force: true });
    for (const name of ['live', 'infections', 'mutations', 'transmissions']) {
      cpSync(join(root, name), join(examples, name), { recursive: true });
    }
  } finally { cleanup(); }
});

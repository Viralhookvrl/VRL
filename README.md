![VIRAL](viralban.png)

# VIRAL

An infection network that lives on Ethereum.

Wallets infect wallets. Every eligible swap rewrites the genome. Infections lapse on a counter that nobody controls, and the wallets they touched carry the strain until it does.

This repository is the field record. It reads the contract and writes down what it finds — infections, mutations, expirations — and it never writes back. Ethereum is the only source of truth here; everything below it is transcription.

---

## LIVE

<!-- VIRAL:LIVE:START -->

| Outbreak | Current state |
| --- | --- |
| Strain | `VRL-3676-AC7E` |
| Genome | `0x3676…fd42` |
| Revision | [152](mutations/) |
| Active hosts | 15 |
| Immune hosts | 0 |
| Total transmissions | [15](transmissions/) |
| Eligible swaps | 152 |
| Finalized through | [26049794](https://etherscan.io/block/26049794) |
| Contract | [`0xA14eDfD52357Bf7DF3a21C66F667d2e15Cc950a1`](https://etherscan.io/address/0xA14eDfD52357Bf7DF3a21C66F667d2e15Cc950a1) |

### Recent transmissions

| Block | Infector | Host | Strain | Gen | Cut |
| --- | --- | --- | --- | --- | --- |
| [26049793](https://etherscan.io/block/26049793) | [`0x2e23…a412`](https://etherscan.io/address/0x2e23efFCB67AB9BE0A176b40e7A8565D9C9Aa412) | [`0xE463…22D9`](https://etherscan.io/address/0xE463E91b5Ac588E24Ac810d403795f08F86822D9) | `VRL-E4EF-9B1B` | 3 | 7.88% |
| [26049787](https://etherscan.io/block/26049787) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0x2e23…a412`](https://etherscan.io/address/0x2e23efFCB67AB9BE0A176b40e7A8565D9C9Aa412) | `VRL-78B5-0771` | 2 | 7.33% |
| [26049782](https://etherscan.io/block/26049782) | [`0x2e23…a412`](https://etherscan.io/address/0x2e23efFCB67AB9BE0A176b40e7A8565D9C9Aa412) | [`0x236f…Bc37`](https://etherscan.io/address/0x236f34dFf86502596E8F5d129809B9783531Bc37) | `VRL-D2AA-8CF7` | 1 | 7.99% |
| [26049773](https://etherscan.io/block/26049773) | [`0x2e23…a412`](https://etherscan.io/address/0x2e23efFCB67AB9BE0A176b40e7A8565D9C9Aa412) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | `VRL-FF35-BB77` | 1 | 5.00% |
| [26049709](https://etherscan.io/block/26049709) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0x2990…35C6`](https://etherscan.io/address/0x29909b9c97845D5eb998B4AA41664a46c5dc35C6) | `VRL-FBB4-9D42` | 1 | 5.24% |
| [26049698](https://etherscan.io/block/26049698) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0xc14D…0D95`](https://etherscan.io/address/0xc14DB08A71928E14Aff08DE1D662680ebCE60D95) | `VRL-41D8-5F83` | 1 | 8.91% |
| [26049681](https://etherscan.io/block/26049681) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0x6884…2e3a`](https://etherscan.io/address/0x6884e3B6d36a3573e78dB71B38AeD3620d1F2e3a) | `VRL-F658-7899` | 1 | 6.90% |
| [26049671](https://etherscan.io/block/26049671) | [`0x6884…2e3a`](https://etherscan.io/address/0x6884e3B6d36a3573e78dB71B38AeD3620d1F2e3a) | [`0xD250…DeaD`](https://etherscan.io/address/0xD2507B4958B449695201599E8d8A25f4BAB5DeaD) | `VRL-9581-8E9D` | 1 | 8.93% |

### Most transmissions caused

| Wallet | Hosts infected |
| --- | --- |
| [`0x02b9…c5e4`](https://etherscan.io/address/0x02b95471188985D78669bEAa000abEe3942fc5e4) | 5 |
| [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | 4 |
| [`0x2e23…a412`](https://etherscan.io/address/0x2e23efFCB67AB9BE0A176b40e7A8565D9C9Aa412) | 3 |
| [`0x6884…2e3a`](https://etherscan.io/address/0x6884e3B6d36a3573e78dB71B38AeD3620d1F2e3a) | 2 |
| [`0xc14D…0D95`](https://etherscan.io/address/0xc14DB08A71928E14Aff08DE1D662680ebCE60D95) | 1 |

Latest mutation: [revision 152](mutations/000152.json) — `VRL-3676-AC7E` at block [26049759](https://etherscan.io/block/26049759), in [`0x29067088…`](https://etherscan.io/tx/0x2906708867d2807a74bca35cc621b9a5733d939227ea0b3703225ed2a133acb1).

[State](live/state.json) · [Genome](live/genome.json) · [Outbreak](live/outbreak.json) · [Infections](infections/) · [Mutations](mutations/) · [Transmissions](transmissions/)

152 mutations and 15 transmissions archived. An infection expires on a swap count, then the host stays immune for 32 eligible swaps.

*Snapshot of finalized Ethereum state. This section updates when the sync workflow runs.*

<!-- VIRAL:LIVE:END -->

---

## THE GENOME

```
   rev 1      rev 2      rev 3      rev 4
   ──●──────────●──────────●──────────●──▶
     │          │          │          │
   strain     strain     strain     strain
```

Every eligible swap folds the swap's own data into the previous genome and produces a new one. There is no setter, no oracle, no admin call — the mutation function runs only from inside a swap, and it is the only thing that can ever write the genome.

Each revision is archived the moment it is observed, in `mutations/`. Nothing is recomputed later, and no file is ever rewritten.

---

## HOSTS

Any wallet holding a single VRL can dose another — provided the target is big enough to be worth infecting, and is neither immune nor already carrying a strain. What transfers is one token; what matters is the record it leaves behind.

Each infection freezes a snapshot at the moment it happens — which strain, which generation, and what share of the host's future rewards is owed to whoever infected it. Later mutations do not touch it. The cut was set once.

Current records live in `infections/`, one file per wallet, keyed by address.

---

## DECAY

```
   INFECTED ──────▶ IMMUNE ──────▶ CLEAN
            expiry          +32 swaps
```

Infections do not run on a clock. They run on the eligible swap counter, and they end when it passes them.

Nothing announces this. No event fires, no transaction is sent, nobody pays gas to end anything. The contract resolves a wallet's state lazily, the moment someone asks — and so does this mirror, on every sync, whether or not a single log arrived.

A host that expires becomes immune for thirty-two eligible swaps, then clean, then infectable again.

---

## TRANSMISSIONS

Every infection ever created gets its own file in `transmissions/`, named for the block and log position that produced it.

These are never edited and never deleted. When a wallet is infected a second time its current record is replaced, but the transmission that created the first one stays exactly where it was. The chain of who infected whom survives even when none of the infections do.

---

## SAMPLE

[A mirror mid-outbreak](examples/README.md), rendered from sample state.

---

## ONE DIRECTION

```
   ETHEREUM  ───────────────▶  GITHUB
             read-only
```

This repository holds no keys, signs nothing, and sends no transactions. It cannot reach the contract even if it wanted to. It knows one address and one block, and reads forward from there.

If this archive were deleted tomorrow, the network would not notice. It is a record, not a participant.

---

*The outbreak is not described here. It is only witnessed.*

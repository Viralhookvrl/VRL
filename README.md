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
| Strain | `VRL-947E-0695` |
| Genome | `0x947e…ed2c` |
| Revision | [146](mutations/) |
| Active hosts | 11 |
| Immune hosts | 0 |
| Total transmissions | [11](transmissions/) |
| Eligible swaps | 146 |
| Finalized through | [26049740](https://etherscan.io/block/26049740) |
| Contract | [`0xA14eDfD52357Bf7DF3a21C66F667d2e15Cc950a1`](https://etherscan.io/address/0xA14eDfD52357Bf7DF3a21C66F667d2e15Cc950a1) |

### Recent transmissions

| Block | Infector | Host | Strain | Gen | Cut |
| --- | --- | --- | --- | --- | --- |
| [26049709](https://etherscan.io/block/26049709) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0x2990…35C6`](https://etherscan.io/address/0x29909b9c97845D5eb998B4AA41664a46c5dc35C6) | `VRL-FBB4-9D42` | 1 | 5.24% |
| [26049698](https://etherscan.io/block/26049698) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0xc14D…0D95`](https://etherscan.io/address/0xc14DB08A71928E14Aff08DE1D662680ebCE60D95) | `VRL-41D8-5F83` | 1 | 8.91% |
| [26049681](https://etherscan.io/block/26049681) | [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | [`0x6884…2e3a`](https://etherscan.io/address/0x6884e3B6d36a3573e78dB71B38AeD3620d1F2e3a) | `VRL-F658-7899` | 1 | 6.90% |
| [26049671](https://etherscan.io/block/26049671) | [`0x6884…2e3a`](https://etherscan.io/address/0x6884e3B6d36a3573e78dB71B38AeD3620d1F2e3a) | [`0xD250…DeaD`](https://etherscan.io/address/0xD2507B4958B449695201599E8d8A25f4BAB5DeaD) | `VRL-9581-8E9D` | 1 | 8.93% |
| [26049628](https://etherscan.io/block/26049628) | [`0xc14D…0D95`](https://etherscan.io/address/0xc14DB08A71928E14Aff08DE1D662680ebCE60D95) | [`0x57AF…1023`](https://etherscan.io/address/0x57AF43345967Af57E90a112bFa7e224Bd6691023) | `VRL-BAE7-C52C` | 1 | 5.10% |
| [26049627](https://etherscan.io/block/26049627) | [`0x02b9…c5e4`](https://etherscan.io/address/0x02b95471188985D78669bEAa000abEe3942fc5e4) | [`0xDcA4…F3E3`](https://etherscan.io/address/0xDcA4348261e719F46daF90b8DEeB7Ad16049F3E3) | `VRL-5BC4-3096` | 1 | 8.34% |
| [26049626](https://etherscan.io/block/26049626) | [`0x02b9…c5e4`](https://etherscan.io/address/0x02b95471188985D78669bEAa000abEe3942fc5e4) | [`0x7F08…1ee5`](https://etherscan.io/address/0x7F08779B038A081eDEDc171A6401d54c7Db41ee5) | `VRL-8007-F280` | 1 | 6.65% |
| [26049623](https://etherscan.io/block/26049623) | [`0x02b9…c5e4`](https://etherscan.io/address/0x02b95471188985D78669bEAa000abEe3942fc5e4) | [`0x188A…0c81`](https://etherscan.io/address/0x188A9c66683924c9E2F99db1c540ff110d910c81) | `VRL-C6C7-A7DC` | 1 | 7.65% |

### Most transmissions caused

| Wallet | Hosts infected |
| --- | --- |
| [`0x02b9…c5e4`](https://etherscan.io/address/0x02b95471188985D78669bEAa000abEe3942fc5e4) | 5 |
| [`0xf40b…4151`](https://etherscan.io/address/0xf40bDc35f32089c549d90356A0155f612Cf74151) | 3 |
| [`0x6884…2e3a`](https://etherscan.io/address/0x6884e3B6d36a3573e78dB71B38AeD3620d1F2e3a) | 2 |
| [`0xc14D…0D95`](https://etherscan.io/address/0xc14DB08A71928E14Aff08DE1D662680ebCE60D95) | 1 |

Latest mutation: [revision 146](mutations/000146.json) — `VRL-947E-0695` at block [26049734](https://etherscan.io/block/26049734), in [`0xcd580381…`](https://etherscan.io/tx/0xcd580381cbd9506f85c8fe96d72f6715098ee0260c5e443899a0eb2e875bfc38).

[State](live/state.json) · [Genome](live/genome.json) · [Outbreak](live/outbreak.json) · [Infections](infections/) · [Mutations](mutations/) · [Transmissions](transmissions/)

146 mutations and 11 transmissions archived. An infection expires on a swap count, then the host stays immune for 32 eligible swaps.

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

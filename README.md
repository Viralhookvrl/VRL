![VIRAL](viralban.png)

# VIRAL

An infection network that lives on Ethereum.

Wallets infect wallets. Every eligible swap rewrites the genome. Infections lapse on a counter that nobody controls, and the wallets they touched carry the strain until it does.

This repository is the field record. It reads the contract and writes down what it finds — infections, mutations, expirations — and it never writes back. Ethereum is the only source of truth here; everything below it is transcription.

---

## LIVE

<!-- VIRAL:LIVE:START -->

```
          \   |   /
        .--'---'--.
       /           \        no strain
  ----(      ·      )----   no hosts
       \           /        no transmissions
        '--.---.--'
          /   |   \
```

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

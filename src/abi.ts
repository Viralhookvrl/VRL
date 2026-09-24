import { parseAbi } from 'viem';

/// The subset of the VRL token ABI this mirror reads. Events only, plus the views used to
/// cross-check the replayed state. Nothing here is writable.
export const abi = parseAbi([
  'event HookBound(address indexed hook)',
  'event GenomeMutated(uint256 indexed revision, bytes32 genome, uint256 eligibleSwapCount)',
  'event Infected(address indexed host, address indexed infector, bytes32 strainCode, uint32 generation, uint16 rewardCutBps, uint64 createdAtSwap, uint64 expiresAtSwap)',
  'event Payout(address indexed account, uint256 net, uint256 infectionCut, address indexed infector, uint256 windowId)',
  'event CutFiled(address indexed infector, address indexed host, uint256 amount, uint256 firstWindow, uint16 cutBps)',
  'event TrancheLapsed(address indexed account, uint256 amount, uint256 firstWindow)',
  'function strainState() view returns (bytes32 g, uint256 rev, uint256 swaps)',
  'function totalInfections() view returns (uint256)',
  'function stateOf(address account) view returns (uint8)',
]);

/// Mirrors the contract's HostState enum.
export const HOST_STATE = ['CLEAN', 'INFECTED', 'IMMUNE'] as const;
export type HostState = (typeof HOST_STATE)[number];

/// Eligible swaps a wallet stays IMMUNE after its infection expires (VRLToken.IMMUNITY_SWAPS).
export const IMMUNITY_SWAPS = 32;

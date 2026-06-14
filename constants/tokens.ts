// =============================================================================
// Haidee — Constants & Token Addresses
// =============================================================================

import { type Address } from "viem";
import { baseSepolia } from "wagmi/chains";

// -----------------------------------------------------------------------------
// Chain Configuration
// -----------------------------------------------------------------------------

export const SUPPORTED_CHAIN = baseSepolia;
export const CHAIN_ID = baseSepolia.id; // 84532

// -----------------------------------------------------------------------------
// Token Addresses — Base Sepolia
// -----------------------------------------------------------------------------

/** USDC on Base Sepolia (Circle testnet deployment) */
export const USDC_ADDRESS: Address =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** USDC decimals */
export const USDC_DECIMALS = 6;

/** ETH decimals */
export const ETH_DECIMALS = 18;

// -----------------------------------------------------------------------------
// Protocol Addresses — Base Sepolia
// -----------------------------------------------------------------------------

/** Aave v3 Pool on Base Sepolia */
export const AAVE_POOL_ADDRESS: Address =
  "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";

/** Aave aUSDC token on Base Sepolia */
export const AAVE_AUSDC_ADDRESS: Address =
  "0xf53B60F4006cab2b3C4688ce41fD5362427A2A66";

// -----------------------------------------------------------------------------
// EIP-7710 Execution Contract
// -----------------------------------------------------------------------------

/** Placeholder — replace with your deployed delegate contract */
export const EXECUTION_CONTRACT_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

// -----------------------------------------------------------------------------
// Supported Tokens
// -----------------------------------------------------------------------------

export const SUPPORTED_TOKENS = [
  {
    symbol: "ETH",
    name: "Ethereum",
    decimals: ETH_DECIMALS,
    address: null as Address | null, // native token
    icon: "⟠",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: USDC_DECIMALS,
    address: USDC_ADDRESS,
    icon: "💲",
  },
] as const;

// -----------------------------------------------------------------------------
// EIP-712 Types for x402
// -----------------------------------------------------------------------------

export const X402_DOMAIN = {
  name: "x402-facilitator",
  version: "1",
  chainId: CHAIN_ID,
} as const;

export const X402_SWAP_TYPES = {
  SwapRequest: [
    { name: "type", type: "string" },
    { name: "fromToken", type: "string" },
    { name: "toToken", type: "string" },
    { name: "amount", type: "string" },
    { name: "permissionsContext", type: "string" },
  ],
} as const;

export const X402_STAKE_TYPES = {
  StakeRequest: [
    { name: "type", type: "string" },
    { name: "token", type: "string" },
    { name: "amount", type: "string" },
    { name: "protocol", type: "string" },
    { name: "permissionsContext", type: "string" },
  ],
} as const;

// -----------------------------------------------------------------------------
// ERC-20 ABI (minimal)
// -----------------------------------------------------------------------------

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// -----------------------------------------------------------------------------
// Aave v3 Pool ABI (minimal)
// -----------------------------------------------------------------------------

export const AAVE_POOL_ABI = [
  {
    name: "getUserAccountData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

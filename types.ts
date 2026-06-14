// =============================================================================
// Haidee — Core Type Definitions
// =============================================================================

/**
 * WalletIntent — the structured JSON intent Venice AI returns after parsing
 * a user message. Each variant corresponds to a wallet action.
 */
export type WalletIntent =
  | { action: "check_balance"; token?: string }
  | { action: "check_history"; limit?: number }
  | { action: "check_staking" }
  | {
      action: "swap";
      from_token: string;
      to_token: string;
      amount: number;
      amount_in_usd: boolean;
    }
  | { action: "stake"; token: string; amount: number; protocol: string }
  | {
      action: "unstake";
      token?: string;
      protocol?: string;
      amount?: "all" | number;
    }
  | {
      action: "transfer";
      token: string;
      amount: number;
      recipient: string;
    }
  | { action: "clarify"; message: string };

/**
 * QuoteData — data returned from a DEX aggregator or protocol for
 * confirmations shown in chat.
 */
export interface QuoteData {
  /** For swaps */
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  toAmount?: string;
  rate?: string;
  slippage?: number;
  /** For staking */
  apy?: number;
  currentBalance?: string;
  earnedInterest?: string;
  /** For transfers */
  recipient?: string;
  amount?: string;
  token?: string;
}

/**
 * ConversationState — tracks multi-turn interactions (e.g., waiting for
 * the user to confirm a swap before executing).
 */
export type ConversationState =
  | { status: "idle" }
  | {
      status: "awaiting_confirmation";
      pendingAction: WalletIntent;
      quoteData: QuoteData;
      expiresAt: number;
    }
  | { status: "executing"; txHash?: string }
  | { status: "error"; message: string };

/**
 * ChatMessage — a single message in the conversation thread.
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** Optional structured data for confirmation cards */
  confirmationData?: {
    action: WalletIntent;
    quoteData: QuoteData;
    expiresAt: number;
  };
}

/**
 * Token balance info returned from on-chain reads.
 */
export interface TokenBalance {
  symbol: string;
  balance: string;
  balanceFormatted: string;
  usdValue: string;
}

/**
 * Transaction history entry.
 */
export interface TransactionEntry {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: "success" | "failed" | "pending";
  description?: string;
}

/**
 * Staking position info.
 */
export interface StakingPosition {
  protocol: string;
  token: string;
  deposited: string;
  currentValue: string;
  earnedInterest: string;
  apy: number;
}

/**
 * API response shape from /api/chat
 */
export interface ChatApiResponse {
  reply: string;
  newState: ConversationState;
  confirmationData?: {
    action: WalletIntent;
    quoteData: QuoteData;
    expiresAt: number;
  };
}

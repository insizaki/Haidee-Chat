// =============================================================================
// Chat Message Formatters
// =============================================================================
//
// These formatters produce the emoji-rich chat messages shown in the PRD.
//

import type {
  TokenBalance,
  TransactionEntry,
  StakingPosition,
  WalletIntent,
  QuoteData,
} from "@/types";

// -----------------------------------------------------------------------------
// Balance
// -----------------------------------------------------------------------------

export function formatBalanceMessage(balances: TokenBalance[]): string {
  const lines = balances.map((b) => {
    const icon = b.symbol === "ETH" ? "⟠" : "💲";
    return `${icon} **${b.symbol}**    ${b.balanceFormatted} ${b.symbol}    (~$${b.usdValue})`;
  });

  return `💰 **Your Wallet**\n\n${lines.join("\n")}`;
}

// -----------------------------------------------------------------------------
// Transaction History
// -----------------------------------------------------------------------------

export function formatHistoryMessage(history: TransactionEntry[]): string {
  if (history.length === 0) {
    return "📋 No recent transactions found.";
  }

  const lines = history.map((tx) => {
    const timeAgo = getTimeAgo(tx.timestamp);
    const statusIcon =
      tx.status === "success" ? "✅" : tx.status === "failed" ? "❌" : "⏳";
    const hashShort = tx.hash.length > 12
      ? `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`
      : tx.hash;
    return `${statusIcon} ${tx.value} — ${timeAgo}\n   \`${hashShort}\``;
  });

  return `📋 **Recent Transactions**\n\n${lines.join("\n\n")}`;
}

// -----------------------------------------------------------------------------
// Staking
// -----------------------------------------------------------------------------

export function formatStakingMessage(
  position: StakingPosition | null
): string {
  if (!position) {
    return "📊 You don't have any active staking positions. Say \"Stake 100 USDC to Aave\" to get started!";
  }

  return [
    "📊 **Staking Positions**\n",
    `🏦 **${position.protocol}**`,
    `   Token: ${position.token}`,
    `   Deposited: ${position.deposited} ${position.token}`,
    `   Current Value: $${position.currentValue}`,
    `   Earned: +$${position.earnedInterest}`,
    `   APY: ${position.apy}%`,
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Swap Confirmation
// -----------------------------------------------------------------------------

export function formatSwapConfirmation(
  intent: Extract<WalletIntent, { action: "swap" }>,
  quote: QuoteData
): string {
  return [
    `🔄 **Swap Confirmation**\n`,
    `Swap **${quote.fromAmount} ${intent.from_token}** → **~${quote.toAmount} ${intent.to_token}**`,
    `Rate: ${quote.rate}`,
    `Slippage: ${quote.slippage}%`,
    `\nType **"confirm"** or **"cancel"** (expires in 30s)`,
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Transfer Confirmation
// -----------------------------------------------------------------------------

export function formatTransferConfirmation(
  intent: Extract<WalletIntent, { action: "transfer" }>
): string {
  const recipientShort =
    intent.recipient.length > 16
      ? `${intent.recipient.slice(0, 10)}...${intent.recipient.slice(-6)}`
      : intent.recipient;

  return [
    `📤 **Transfer Confirmation**\n`,
    `Send **${intent.amount} ${intent.token}** to \`${recipientShort}\``,
    `\nType **"confirm"** or **"cancel"** (expires in 30s)`,
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Stake Confirmation
// -----------------------------------------------------------------------------

export function formatStakeConfirmation(
  intent: Extract<WalletIntent, { action: "stake" }>,
  quote: QuoteData
): string {
  return [
    `🏦 **Stake Confirmation**\n`,
    `Stake **${intent.amount} ${intent.token}** to ${intent.protocol.charAt(0).toUpperCase() + intent.protocol.slice(1)}`,
    `Current APY: **${quote.apy}%** (~$${quote.earnedInterest}/year)`,
    `\nType **"confirm"** or **"cancel"** (expires in 30s)`,
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Unstake Confirmation
// -----------------------------------------------------------------------------

export function formatUnstakeConfirmation(
  intent: Extract<WalletIntent, { action: "unstake" }>,
  quote: QuoteData
): string {
  const amountStr =
    intent.amount === "all"
      ? "all"
      : `${intent.amount} ${intent.token || "USDC"}`;

  return [
    `📤 **Unstake Confirmation**\n`,
    `Withdraw **${amountStr}** from ${(intent.protocol || "Aave").charAt(0).toUpperCase() + (intent.protocol || "aave").slice(1)}`,
    quote.earnedInterest ? `Earned interest: +$${quote.earnedInterest}` : "",
    `\nType **"confirm"** or **"cancel"** (expires in 30s)`,
  ]
    .filter(Boolean)
    .join("\n");
}

// -----------------------------------------------------------------------------
// Success / Error
// -----------------------------------------------------------------------------

export function formatSuccessMessage(
  action: string,
  txHash: string,
  details?: string
): string {
  const hashShort =
    txHash.length > 16
      ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}`
      : txHash;

  return [
    `✅ **${action} Complete!**`,
    details ? `\n${details}` : "",
    `\nTx: \`${hashShort}\``,
  ]
    .filter(Boolean)
    .join("");
}

export function formatErrorMessage(error: string): string {
  return `❌ **Error:** ${error}\n\nWould you like to try again?`;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

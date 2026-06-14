// =============================================================================
// POST /api/chat — Main Chat Orchestrator
// =============================================================================
//
// This is the central API route that processes every user message through
// the conversation state machine (PRD §9).
//

import { type NextRequest } from "next/server";
import { parseIntent } from "@/lib/venice";
import { fetchBalances, fetchHistory, fetchStakingPosition } from "@/lib/onchain";
import { getSwapQuote, getStakeQuoteData } from "@/lib/aave";
import { isConfirmation, isCancellation, QUOTE_EXPIRY_MS } from "@/lib/state";
import {
  formatBalanceMessage,
  formatHistoryMessage,
  formatStakingMessage,
  formatSwapConfirmation,
  formatStakeConfirmation,
  formatUnstakeConfirmation,
  formatTransferConfirmation,
  formatSuccessMessage,
  formatErrorMessage,
} from "@/lib/format";
import type { ConversationState, WalletIntent, ChatApiResponse } from "@/types";
import type { Address } from "viem";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, state, walletAddress } = (await req.json()) as {
      message: string;
      state: ConversationState;
      walletAddress: string;
    };

    const address = walletAddress as Address;

    // =========================================================================
    // Step 1: If awaiting confirmation, check if this is a yes/no
    // =========================================================================
    if (state.status === "awaiting_confirmation") {
      // Check quote expiry first
      if (Date.now() > state.expiresAt) {
        return Response.json({
          reply:
            "⏰ Quote expired. Say your request again to get a fresh quote.",
          newState: { status: "idle" },
        } satisfies ChatApiResponse);
      }

      if (isConfirmation(message)) {
        // Execute the pending action
        const result = await executeAction(state.pendingAction, address);
        return Response.json(result);
      }

      if (isCancellation(message)) {
        return Response.json({
          reply: "Cancelled. What else can I help you with?",
          newState: { status: "idle" },
        } satisfies ChatApiResponse);
      }

      // If neither yes nor no, fall through to Venice to re-interpret
    }

    // =========================================================================
    // Step 2: Parse intent via Venice AI
    // =========================================================================
    const intent = await parseIntent(message);

    // =========================================================================
    // Step 3: Handle informational intents (no confirmation needed)
    // =========================================================================

    // -- Check Balance --
    if (intent.action === "check_balance") {
      const balances = await fetchBalances(address);
      return Response.json({
        reply: formatBalanceMessage(balances),
        newState: { status: "idle" },
      } satisfies ChatApiResponse);
    }

    // -- Check History --
    if (intent.action === "check_history") {
      const history = await fetchHistory(address, intent.limit || 5);
      return Response.json({
        reply: formatHistoryMessage(history),
        newState: { status: "idle" },
      } satisfies ChatApiResponse);
    }

    // -- Check Staking --
    if (intent.action === "check_staking") {
      const position = await fetchStakingPosition(address);
      return Response.json({
        reply: formatStakingMessage(position),
        newState: { status: "idle" },
      } satisfies ChatApiResponse);
    }

    // -- Clarify --
    if (intent.action === "clarify") {
      return Response.json({
        reply: intent.message,
        newState: { status: "idle" },
      } satisfies ChatApiResponse);
    }

    // =========================================================================
    // Step 4: Action intents → fetch quote → request confirmation
    // =========================================================================

    // -- Swap --
    if (intent.action === "swap") {
      const quote = await getSwapQuote(intent);
      const confirmMsg = formatSwapConfirmation(intent, quote);

      return Response.json({
        reply: confirmMsg,
        newState: {
          status: "awaiting_confirmation",
          pendingAction: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
        confirmationData: {
          action: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
      } satisfies ChatApiResponse);
    }

    // -- Stake --
    if (intent.action === "stake") {
      const quote = await getStakeQuoteData({
        token: intent.token,
        amount: intent.amount,
        action: "stake",
      });
      const confirmMsg = formatStakeConfirmation(intent, quote);

      return Response.json({
        reply: confirmMsg,
        newState: {
          status: "awaiting_confirmation",
          pendingAction: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
        confirmationData: {
          action: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
      } satisfies ChatApiResponse);
    }

    // -- Unstake --
    if (intent.action === "unstake") {
      const amount =
        intent.amount === "all" ? 100 : (intent.amount as number) || 100;
      const quote = await getStakeQuoteData({
        token: intent.token || "USDC",
        amount,
        action: "unstake",
      });
      const confirmMsg = formatUnstakeConfirmation(intent, quote);

      return Response.json({
        reply: confirmMsg,
        newState: {
          status: "awaiting_confirmation",
          pendingAction: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
        confirmationData: {
          action: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
      } satisfies ChatApiResponse);
    }

    // -- Transfer --
    if (intent.action === "transfer") {
      const quote = {
        token: intent.token,
        amount: intent.amount.toString(),
        recipient: intent.recipient,
      };
      const confirmMsg = formatTransferConfirmation(intent);

      return Response.json({
        reply: confirmMsg,
        newState: {
          status: "awaiting_confirmation",
          pendingAction: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
        confirmationData: {
          action: intent,
          quoteData: quote,
          expiresAt: Date.now() + QUOTE_EXPIRY_MS,
        },
      } satisfies ChatApiResponse);
    }

    // Fallback
    return Response.json({
      reply:
        "I'm not sure how to handle that. Try asking about your balance, swapping tokens, or managing staking.",
      newState: { status: "idle" },
    } satisfies ChatApiResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      {
        reply: formatErrorMessage(
          "Something went wrong. Please try again."
        ),
        newState: { status: "error", message: "Internal error" },
      } satisfies ChatApiResponse,
      { status: 500 }
    );
  }
}

// =============================================================================
// Action Execution (mock for MVP)
// =============================================================================

async function executeAction(
  intent: WalletIntent,
  _address: Address
): Promise<ChatApiResponse> {
  // Generate a mock tx hash
  const mockTxHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}`;

  // Simulate execution delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  switch (intent.action) {
    case "swap": {
      return {
        reply: formatSuccessMessage(
          "Swap",
          mockTxHash,
          `Swapped ${intent.amount} ${intent.from_token} for ${intent.to_token}`
        ),
        newState: { status: "idle" },
      };
    }

    case "stake": {
      return {
        reply: formatSuccessMessage(
          "Stake",
          mockTxHash,
          `Staked ${intent.amount} ${intent.token} to ${intent.protocol}. You're now earning APY!`
        ),
        newState: { status: "idle" },
      };
    }

    case "unstake": {
      const amountStr =
        intent.amount === "all"
          ? "all funds"
          : `${intent.amount} ${intent.token || "USDC"}`;
      return {
        reply: formatSuccessMessage(
          "Unstake",
          mockTxHash,
          `Withdrew ${amountStr} from ${intent.protocol || "Aave"}`
        ),
        newState: { status: "idle" },
      };
    }

    case "transfer": {
      return {
        reply: formatSuccessMessage(
          "Transfer",
          mockTxHash,
          `Sent ${intent.amount} ${intent.token} to ${intent.recipient.slice(0, 6)}...${intent.recipient.slice(-4)}`
        ),
        newState: { status: "idle" },
      };
    }

    default:
      return {
        reply: "Action completed.",
        newState: { status: "idle" },
      };
  }
}

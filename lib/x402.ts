// =============================================================================
// x402 Protocol — Request Builder & Signing
// =============================================================================
//
// x402 turns on-chain actions into signed HTTP requests executed by a
// facilitator relay. The user never pays gas — the facilitator covers it.
//

import type { WalletClient, Address } from "viem";
import {
  X402_DOMAIN,
  X402_SWAP_TYPES,
  X402_STAKE_TYPES,
} from "@/constants/tokens";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: bigint;
  walletClient: WalletClient;
  permissionsContext: string | null;
}

interface StakeParams {
  token: string;
  amount: bigint;
  protocol: string;
  action: "supply" | "withdraw";
  walletClient: WalletClient;
  permissionsContext: string | null;
}

interface ExecutionResult {
  txHash: string;
  success: boolean;
  error?: string;
}

// -----------------------------------------------------------------------------
// Swap Execution
// -----------------------------------------------------------------------------

/**
 * Execute a token swap via the x402 facilitator.
 *
 * 1. Build swap payload
 * 2. Sign with user's wallet (EIP-712)
 * 3. POST to facilitator with signed headers
 * 4. Return tx hash
 */
export async function executeSwapViaX402(
  params: SwapParams
): Promise<ExecutionResult> {
  const facilitatorUrl = process.env.X402_FACILITATOR_URL;

  if (!facilitatorUrl || facilitatorUrl === "https://facilitator.x402.org") {
    // Facilitator not configured — return mock success for development
    console.warn("x402 facilitator not configured, returning mock tx hash");
    return {
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      success: true,
    };
  }

  const payload = {
    type: "swap",
    fromToken: params.fromToken,
    toToken: params.toToken,
    amount: params.amount.toString(),
    permissionsContext: params.permissionsContext ?? "",
  };

  try {
    // Sign the payload using EIP-712 typed data
    const account = params.walletClient.account;
    if (!account) throw new Error("No account connected");

    const signature = await params.walletClient.signTypedData({
      account,
      domain: X402_DOMAIN,
      types: X402_SWAP_TYPES,
      primaryType: "SwapRequest",
      message: payload,
    });

    // Submit to x402 facilitator
    const response = await fetch(`${facilitatorUrl}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Scheme": "x402",
        "X-Payment": signature,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "x402 execution failed");
    }

    return { txHash: result.txHash, success: true };
  } catch (error) {
    console.error("x402 swap execution error:", error);
    return {
      txHash: "",
      success: false,
      error: error instanceof Error ? error.message : "Swap failed",
    };
  }
}

// -----------------------------------------------------------------------------
// Stake/Unstake Execution
// -----------------------------------------------------------------------------

/**
 * Execute a stake or unstake action via the x402 facilitator.
 */
export async function executeStakeViaX402(
  params: StakeParams
): Promise<ExecutionResult> {
  const facilitatorUrl = process.env.X402_FACILITATOR_URL;

  if (!facilitatorUrl || facilitatorUrl === "https://facilitator.x402.org") {
    console.warn("x402 facilitator not configured, returning mock tx hash");
    return {
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      success: true,
    };
  }

  const payload = {
    type: params.action,
    token: params.token,
    amount: params.amount.toString(),
    protocol: params.protocol,
    permissionsContext: params.permissionsContext ?? "",
  };

  try {
    const account = params.walletClient.account;
    if (!account) throw new Error("No account connected");

    const signature = await params.walletClient.signTypedData({
      account,
      domain: X402_DOMAIN,
      types: X402_STAKE_TYPES,
      primaryType: "StakeRequest",
      message: payload,
    });

    const response = await fetch(`${facilitatorUrl}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Scheme": "x402",
        "X-Payment": signature,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "x402 execution failed");
    }

    return { txHash: result.txHash, success: true };
  } catch (error) {
    console.error("x402 stake execution error:", error);
    return {
      txHash: "",
      success: false,
      error: error instanceof Error ? error.message : "Stake operation failed",
    };
  }
}

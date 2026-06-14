// =============================================================================
// EIP-7710 — Smart Account Delegation
// =============================================================================
//
// EIP-7710 introduces delegation-based execution. The user signs a delegation
// certificate once, and our app can execute approved actions without
// re-prompting each time.
//

import type { WalletClient } from "viem";
import { CHAIN_ID, EXECUTION_CONTRACT_ADDRESS } from "@/constants/tokens";
import { parseUnits } from "viem";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DelegationResult {
  delegation: string | null;
  fallback: boolean;
}

// -----------------------------------------------------------------------------
// Create Delegation
// -----------------------------------------------------------------------------

/**
 * Request an EIP-7710 delegation from the user's wallet.
 *
 * This allows our execution contract to perform approved actions (SWAP, STAKE)
 * within spending limits for a limited time window.
 *
 * Falls back to manual approval if wallet doesn't support EIP-7710.
 */
export async function createDelegation(
  walletClient: WalletClient
): Promise<DelegationResult> {
  try {
    const account = walletClient.account;
    if (!account) {
      return { delegation: null, fallback: true };
    }

    // Request delegation for swap + stake actions directly
    const delegation = await (walletClient as WalletClient & {
      request: (args: { method: string; params: unknown[] }) => Promise<{ certificate: string }>;
    }).request({
      method: "wallet_createSession",
      params: [
        {
          chainId: CHAIN_ID,
          delegate: EXECUTION_CONTRACT_ADDRESS,
          permissions: ["SWAP", "STAKE", "READ"],
          spendingLimit: parseUnits("1000", 6).toString(), // max $1000 USDC
          expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1h session
        },
      ],
    });

    return {
      delegation: delegation.certificate,
      fallback: false,
    };
  } catch (error) {
    console.warn("EIP-7710 delegation failed, using fallback:", error);
    return { delegation: null, fallback: true };
  }
}

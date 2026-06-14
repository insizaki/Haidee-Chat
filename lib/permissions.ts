// =============================================================================
// EIP-7715 — wallet_grantPermissions
// =============================================================================
//
// EIP-7715 lets dApps request granular, scoped permissions from the user's
// wallet at connection time. User approves once, not per-transaction.
//

import type { WalletClient } from "viem";
import { parseEther, parseUnits } from "viem";
import { USDC_ADDRESS } from "@/constants/tokens";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PermissionsResult {
  context: string | null;
  fallback: boolean;
}

// -----------------------------------------------------------------------------
// Request Permissions
// -----------------------------------------------------------------------------

/**
 * Request scoped wallet permissions via EIP-7715 at onboarding.
 *
 * This allows:
 * - ERC-20 transfers up to $1000 USDC/day
 * - Native token transfers up to 0.5 ETH
 * - 24-hour session
 *
 * Falls back to manual approval if wallet doesn't support EIP-7715.
 */
export async function requestWalletPermissions(
  walletClient: WalletClient
): Promise<PermissionsResult> {
  try {
    const account = walletClient.account;
    if (!account) {
      return { context: null, fallback: true };
    }

    // Request scoped permissions directly
    const permissions = await (walletClient as WalletClient & {
      request: (args: { method: string; params: unknown[] }) => Promise<{ context: string }>;
    }).request({
      method: "wallet_grantPermissions",
      params: [
        {
          permissions: [
            {
              type: "erc20-token-transfer",
              data: {
                address: USDC_ADDRESS,
                allowance: parseUnits("1000", 6).toString(), // $1000 USDC daily
              },
            },
            {
              type: "native-token-transfer",
              data: {
                allowance: parseEther("0.5").toString(), // 0.5 ETH limit
              },
            },
          ],
          expiry: Math.floor(Date.now() / 1000) + 86400, // 24h session
        },
      ],
    });

    return { context: permissions.context, fallback: false };
  } catch (error) {
    console.warn("EIP-7715 permissions failed, using fallback:", error);
    return { context: null, fallback: true };
  }
}

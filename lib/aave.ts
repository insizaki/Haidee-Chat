// =============================================================================
// Aave v3 — Protocol Helpers
// =============================================================================

import type { QuoteData } from "@/types";

// -----------------------------------------------------------------------------
// APY Fetching
// -----------------------------------------------------------------------------

/**
 * Fetch current Aave v3 supply APY for USDC on Base.
 *
 * In production, this would query the Aave Protocol Data Provider or the
 * Aave API. For MVP, returns a realistic mock value.
 */
export async function getAaveAPY(): Promise<number> {
  try {
    // TODO: Replace with real Aave API call
    // const response = await fetch('https://aave-api-v2.aave.com/...');
    // const data = await response.json();
    // return data.currentLiquidityRate;

    // Mock APY for development
    return 4.2;
  } catch (error) {
    console.error("Error fetching Aave APY:", error);
    return 4.2; // fallback
  }
}

// -----------------------------------------------------------------------------
// Swap Quote (Mock)
// -----------------------------------------------------------------------------

/** Mock ETH price in USD */
const MOCK_ETH_PRICE = 3012.0;

/**
 * Get a swap quote.
 *
 * In production, this would call 1inch or Uniswap SDK.
 * For MVP, returns a realistic mock quote.
 */
export async function getSwapQuote(params: {
  from_token: string;
  to_token: string;
  amount: number;
  amount_in_usd: boolean;
}): Promise<QuoteData> {
  // Calculate amounts based on mock price
  let fromAmount: string;
  let toAmount: string;
  const slippage = 0.5; // 0.5%

  if (params.from_token === "USDC" && params.to_token === "ETH") {
    const usdcAmount = params.amount_in_usd
      ? params.amount
      : params.amount; // USDC is $1
    const ethAmount = usdcAmount / MOCK_ETH_PRICE;
    fromAmount = usdcAmount.toFixed(2);
    toAmount = ethAmount.toFixed(6);
  } else {
    // ETH → USDC
    const ethAmount = params.amount;
    const usdcAmount = ethAmount * MOCK_ETH_PRICE;
    fromAmount = ethAmount.toFixed(6);
    toAmount = usdcAmount.toFixed(2);
  }

  return {
    fromToken: params.from_token,
    toToken: params.to_token,
    fromAmount,
    toAmount,
    rate: `$${MOCK_ETH_PRICE.toLocaleString()}/ETH`,
    slippage,
  };
}

/**
 * Get staking quote data for confirmations.
 */
export async function getStakeQuoteData(params: {
  token: string;
  amount: number;
  action: "stake" | "unstake";
}): Promise<QuoteData> {
  const apy = await getAaveAPY();
  const yearlyEarnings = params.amount * (apy / 100);

  return {
    apy,
    fromToken: params.token,
    fromAmount: params.amount.toString(),
    earnedInterest: yearlyEarnings.toFixed(2),
  };
}

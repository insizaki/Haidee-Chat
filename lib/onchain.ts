// =============================================================================
// On-Chain Data Reads — Balance, History, Staking
// =============================================================================

import { createPublicClient, http, formatEther, formatUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  AAVE_POOL_ADDRESS,
  AAVE_AUSDC_ADDRESS,
  ERC20_ABI,
  AAVE_POOL_ABI,
} from "@/constants/tokens";
import type { TokenBalance, TransactionEntry, StakingPosition } from "@/types";

// -----------------------------------------------------------------------------
// Public Client
// -----------------------------------------------------------------------------

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || "demo"}`;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpcUrl),
});

// -----------------------------------------------------------------------------
// Mock ETH price for display purposes
// (In production, use a price oracle or CoinGecko API)
// -----------------------------------------------------------------------------

const MOCK_ETH_PRICE = 3012.0;
const MOCK_USDC_PRICE = 1.0;

// -----------------------------------------------------------------------------
// Balance Fetching
// -----------------------------------------------------------------------------

export async function fetchBalances(
  address: Address
): Promise<TokenBalance[]> {
  try {
    // Fetch ETH and USDC balances in parallel
    const [ethBalance, usdcBalance] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      }),
    ]);

    const ethFormatted = formatEther(ethBalance);
    const usdcFormatted = formatUnits(usdcBalance as bigint, USDC_DECIMALS);

    return [
      {
        symbol: "ETH",
        balance: ethBalance.toString(),
        balanceFormatted: parseFloat(ethFormatted).toFixed(4),
        usdValue: (parseFloat(ethFormatted) * MOCK_ETH_PRICE).toFixed(2),
      },
      {
        symbol: "USDC",
        balance: (usdcBalance as bigint).toString(),
        balanceFormatted: parseFloat(usdcFormatted).toFixed(2),
        usdValue: (parseFloat(usdcFormatted) * MOCK_USDC_PRICE).toFixed(2),
      },
    ];
  } catch (error) {
    console.error("Error fetching balances:", error);
    // Return mock data if RPC fails (useful for development)
    return [
      {
        symbol: "ETH",
        balance: "0",
        balanceFormatted: "0.4200",
        usdValue: "1,265.04",
      },
      {
        symbol: "USDC",
        balance: "0",
        balanceFormatted: "500.00",
        usdValue: "500.00",
      },
    ];
  }
}

// -----------------------------------------------------------------------------
// Transaction History
// -----------------------------------------------------------------------------

export async function fetchHistory(
  address: Address,
  limit: number = 5
): Promise<TransactionEntry[]> {
  let alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey && process.env.NEXT_PUBLIC_RPC_URL) {
    const parts = process.env.NEXT_PUBLIC_RPC_URL.split("/");
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart !== "your_alchemy_key_here" && !lastPart.includes("http")) {
      alchemyKey = lastPart;
    }
  }

  if (alchemyKey && alchemyKey !== "your_alchemy_key_here") {
    try {
      const response = await fetch(
        `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "alchemy_getAssetTransfers",
            params: [
              {
                fromAddress: address,
                category: ["external", "erc20"],
                maxCount: `0x${limit.toString(16)}`,
                order: "desc",
                withMetadata: true,
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const transfers = data.result?.transfers || [];

      return transfers.map(
        (tx: {
          hash: string;
          from: string;
          to: string;
          value: number;
          asset: string;
          metadata?: { blockTimestamp?: string } | null;
        }) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to || "Contract",
          value: `${tx.value} ${tx.asset}`,
          timestamp: tx.metadata?.blockTimestamp
            ? new Date(tx.metadata.blockTimestamp).getTime()
            : Date.now(),
          status: "success" as const,
        })
      );
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  }

  // Mock history for development
  return ([
    {
      hash: "0xabc1...def1",
      from: address,
      to: "0x1234...5678",
      value: "0.05 ETH",
      timestamp: Date.now() - 3600000,
      status: "success" as const,
      description: "Sent ETH",
    },
    {
      hash: "0xabc2...def2",
      from: "0x8765...4321",
      to: address,
      value: "100 USDC",
      timestamp: Date.now() - 7200000,
      status: "success" as const,
      description: "Received USDC",
    },
    {
      hash: "0xabc3...def3",
      from: address,
      to: "Aave Pool",
      value: "50 USDC",
      timestamp: Date.now() - 86400000,
      status: "success" as const,
      description: "Staked to Aave",
    },
  ] as TransactionEntry[]).slice(0, limit);
}

// -----------------------------------------------------------------------------
// Staking Positions
// -----------------------------------------------------------------------------

export async function fetchStakingPosition(
  address: Address
): Promise<StakingPosition | null> {
  try {
    // Read aUSDC balance (represents staked USDC)
    const aTokenBalance = (await publicClient.readContract({
      address: AAVE_AUSDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    if (aTokenBalance === BigInt(0)) return null;

    const formatted = formatUnits(aTokenBalance, USDC_DECIMALS);

    // Read Aave account data
    const accountData = (await publicClient.readContract({
      address: AAVE_POOL_ADDRESS,
      abi: AAVE_POOL_ABI,
      functionName: "getUserAccountData",
      args: [address],
    })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint];

    const totalCollateralUsd = parseFloat(
      formatUnits(accountData[0], 8)
    );

    return {
      protocol: "Aave v3",
      token: "USDC",
      deposited: parseFloat(formatted).toFixed(2),
      currentValue: totalCollateralUsd.toFixed(2),
      earnedInterest: (
        totalCollateralUsd - parseFloat(formatted)
      ).toFixed(2),
      apy: 4.2, // In production, fetch dynamically from Aave
    };
  } catch (error) {
    console.error("Error fetching staking position:", error);
    // Mock data for development
    return {
      protocol: "Aave v3",
      token: "USDC",
      deposited: "100.00",
      currentValue: "101.20",
      earnedInterest: "1.20",
      apy: 4.2,
    };
  }
}

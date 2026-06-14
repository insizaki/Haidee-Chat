// =============================================================================
// GET /api/balance — Fetch Token Balances
// =============================================================================

import { type NextRequest } from "next/server";
import { fetchBalances } from "@/lib/onchain";
import type { Address } from "viem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return Response.json({ error: "Missing address parameter" }, { status: 400 });
  }

  try {
    const balances = await fetchBalances(address as Address);
    return Response.json({ balances });
  } catch (error) {
    console.error("Balance API error:", error);
    return Response.json(
      { error: "Failed to fetch balances" },
      { status: 500 }
    );
  }
}

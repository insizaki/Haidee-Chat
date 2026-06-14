// =============================================================================
// GET /api/history — Transaction History
// =============================================================================

import { type NextRequest } from "next/server";
import { fetchHistory } from "@/lib/onchain";
import type { Address } from "viem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 5;

  if (!address) {
    return Response.json({ error: "Missing address parameter" }, { status: 400 });
  }

  try {
    const history = await fetchHistory(address as Address, limit);
    return Response.json({ history });
  } catch (error) {
    console.error("History API error:", error);
    return Response.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/quote — Swap Quote
// =============================================================================

import { type NextRequest } from "next/server";
import { getSwapQuote } from "@/lib/aave";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const amountStr = req.nextUrl.searchParams.get("amount");
  const amountInUsd = req.nextUrl.searchParams.get("amount_in_usd") === "true";

  if (!from || !to || !amountStr) {
    return Response.json(
      { error: "Missing required parameters: from, to, amount" },
      { status: 400 }
    );
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const quote = await getSwapQuote({
      from_token: from.toUpperCase(),
      to_token: to.toUpperCase(),
      amount,
      amount_in_usd: amountInUsd,
    });

    return Response.json({ quote });
  } catch (error) {
    console.error("Quote API error:", error);
    return Response.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}

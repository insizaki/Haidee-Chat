// =============================================================================
// Venice AI — Intent Parsing
// =============================================================================

import type { WalletIntent } from "@/types";

const VENICE_BASE_URL = "https://api.groq.com/openai/v1";

const SYSTEM_PROMPT = `
You are an AI assistant embedded in a crypto wallet app called Haidee.
The user can ask you to:
1. Check their balance, transaction history, or staking positions
2. Swap between USDC and ETH
3. Stake USDC to Aave or unstake from Aave
4. Transfer tokens (ETH or USDC) to another address
5. Have a general conversation, ask questions about crypto/Web3, or ask general knowledge questions.

Always respond ONLY with a valid JSON object matching ONE of these shapes:
- { "action": "check_balance", "token": "ETH" | "USDC" | null }
- { "action": "check_history", "limit": number }
- { "action": "check_staking" }
- { "action": "swap", "from_token": "USDC" | "ETH", "to_token": "USDC" | "ETH", "amount": number, "amount_in_usd": boolean }
- { "action": "stake", "token": "USDC", "amount": number, "protocol": "aave" }
- { "action": "unstake", "token": "USDC", "protocol": "aave", "amount": "all" | number }
- { "action": "transfer", "token": "USDC" | "ETH", "amount": number, "recipient": "0x..." }
- { "action": "clarify", "message": "your conversational response or explanation here" }

Rules:
- Never respond with raw natural language. Always wrap your responses in the valid JSON object structure.
- If the user wants to perform a wallet action, map it to the corresponding action (check_balance, check_history, check_staking, swap, stake, unstake, transfer).
- If the user is just saying hello, asking questions (e.g. about crypto, history, math, coding, etc.), or having a general conversation, map it to the "clarify" action and put your complete, natural, and helpful chat response in the "message" field. You should behave literally like a standard friendly assistant LLM in this case.
- If the user says something like "what's my balance" without specifying a token, set token to null to show all.
- If the user mentions a dollar amount for a swap, set amount_in_usd to true.
- If the user mentions a token amount (like "0.1 ETH"), set amount_in_usd to false.
- Supported tokens: ETH, USDC. Supported protocols: aave.
`.trim();

/**
 * Validate that a parsed object is a valid WalletIntent
 */
function isValidIntent(obj: unknown): obj is WalletIntent {
  if (!obj || typeof obj !== "object") return false;
  const intent = obj as Record<string, unknown>;

  const validActions = [
    "check_balance",
    "check_history",
    "check_staking",
    "swap",
    "stake",
    "unstake",
    "transfer",
    "clarify",
  ];

  if (!validActions.includes(intent.action as string)) return false;

  // Validate swap has required fields
  if (intent.action === "swap") {
    if (!intent.from_token || !intent.to_token || intent.amount == null)
      return false;
  }

  // Validate stake has required fields
  if (intent.action === "stake") {
    if (!intent.token || intent.amount == null || !intent.protocol)
      return false;
  }

  // Validate transfer has required fields
  if (intent.action === "transfer") {
    if (!intent.token || intent.amount == null || !intent.recipient)
      return false;
  }

  return true;
}

/**
 * Parse a user message into a structured WalletIntent using Venice AI.
 *
 * Falls back to a clarify intent if Venice is unavailable or returns invalid JSON.
 */
export async function parseIntent(
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<WalletIntent> {
  const apiKey = process.env.GROQ_API_KEY || process.env.VENICE_API_KEY;

  // If no API key configured, use local fallback parser
  if (!apiKey || apiKey === "your_venice_api_key_here") {
    return fallbackParseIntent(userMessage);
  }

  try {
    const slicedHistory = history.slice(-10);
    const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...slicedHistory.map((msg) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })),
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Venice API error:", response.status, await response.text());
      return fallbackParseIntent(userMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        action: "clarify",
        message: "I had trouble understanding that. Could you try rephrasing?",
      };
    }

    const parsed = JSON.parse(content);

    if (isValidIntent(parsed)) {
      return parsed;
    }

    return {
      action: "clarify",
      message: "I had trouble understanding that. Could you try rephrasing?",
    };
  } catch (error) {
    console.error("Venice parsing error:", error);
    return fallbackParseIntent(userMessage);
  }
}

/**
 * Local regex-based fallback parser for when Venice API is unavailable.
 * Handles common patterns so the app remains functional without an API key.
 */
function fallbackParseIntent(message: string): WalletIntent {
  const msg = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|sup|yo|gm|good morning|what's up)/.test(msg)) {
    return {
      action: "clarify",
      message:
        "Hey! 👋 I'm Haidee, your wallet assistant. I can check your balance, swap tokens, or manage staking. What would you like to do?",
    };
  }

  // Balance checks
  if (/balance|how much|what do i have|my (eth|usdc|tokens|wallet)/i.test(msg)) {
    const tokenMatch = msg.match(/\b(eth|usdc)\b/i);
    return {
      action: "check_balance",
      token: tokenMatch ? tokenMatch[1].toUpperCase() : undefined,
    };
  }

  // History
  if (/history|transactions?|recent|activity/i.test(msg)) {
    const limitMatch = msg.match(/(\d+)/);
    return {
      action: "check_history",
      limit: limitMatch ? parseInt(limitMatch[1], 10) : 5,
    };
  }

  // Staking check
  if (/staking|am i (earning|making)|my (stakes?|yield|apy)/i.test(msg)) {
    return { action: "check_staking" };
  }

  // Swap
  if (/swap|exchange|convert|trade/i.test(msg)) {
    const usdMatch = msg.match(/\$(\d+(?:[.,]\d+)?)/);
    const amountMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(usdc|eth)/i);

    let amount = 0;
    let amountInUsd = false;
    let fromToken = "USDC";
    let toToken = "ETH";

    if (usdMatch) {
      amount = parseFloat(usdMatch[1].replace(",", "."));
      amountInUsd = true;
    } else if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(",", "."));
      fromToken = amountMatch[2].toUpperCase();
    }

    // Detect direction
    if (/usdc.*(to|for|into).*eth/i.test(msg)) {
      fromToken = "USDC";
      toToken = "ETH";
    } else if (/eth.*(to|for|into).*usdc/i.test(msg)) {
      fromToken = "ETH";
      toToken = "USDC";
    } else {
      toToken = fromToken === "USDC" ? "ETH" : "USDC";
    }

    if (amount === 0) {
      return {
        action: "clarify",
        message:
          "How much would you like to swap? For example: \"Swap $50 USDC to ETH\" or \"Swap 0.1 ETH to USDC\"",
      };
    }

    return {
      action: "swap",
      from_token: fromToken,
      to_token: toToken,
      amount,
      amount_in_usd: amountInUsd,
    };
  }

  // Unstake (check before stake so "unstake" isn't caught by "stake")
  if (/unstake|withdraw|pull out|remove from aave/i.test(msg)) {
    const amountMatch = msg.match(/(\d+(?:[.,]\d+)?)/);
    return {
      action: "unstake",
      token: "USDC",
      protocol: "aave",
      amount: msg.includes("all") || msg.includes("everything")
        ? "all"
        : amountMatch
          ? parseFloat(amountMatch[1].replace(",", "."))
          : "all",
    };
  }

  // Stake
  if (/stake|deposit|supply|lend|put.*aave/i.test(msg)) {
    const amountMatch = msg.match(/(\d+(?:[.,]\d+)?)/);
    if (!amountMatch) {
      return {
        action: "clarify",
        message:
          "How much USDC would you like to stake to Aave? For example: \"Stake 100 USDC to Aave\"",
      };
    }
    return {
      action: "stake",
      token: "USDC",
      amount: parseFloat(amountMatch[1].replace(",", ".")),
      protocol: "aave",
    };
  }

  // Transfer / Send
  if (/send|transfer|pay|give/i.test(msg)) {
    const addressMatch = msg.match(/(0x[a-f0-9]{40})/i);
    const amountMatch = msg.match(/(\d+(?:[.,]\d+)?)/);
    const tokenMatch = msg.match(/\b(eth|usdc)\b/i);

    if (amountMatch && addressMatch) {
      return {
        action: "transfer",
        token: tokenMatch ? tokenMatch[1].toUpperCase() : "ETH",
        amount: parseFloat(amountMatch[1].replace(",", ".")),
        recipient: addressMatch[1],
      };
    } else {
      return {
        action: "clarify",
        message:
          "To send assets, please specify the token, amount, and recipient address. For example: \"Send 0.001 ETH to 0x9a2Fd514Ab94F0EEe7c9D013654515D37479E121\"",
      };
    }
  }

  // Help / default
  if (/help|what can you do|commands/i.test(msg)) {
    return {
      action: "clarify",
      message:
        "Here's what I can do:\n\n💰 **Check balance** — \"What's my balance?\"\n📊 **Transaction history** — \"Show my recent transactions\"\n🔄 **Swap tokens** — \"Swap $50 USDC to ETH\"\n🏦 **Stake** — \"Stake 100 USDC to Aave\"\n📤 **Unstake** — \"Unstake from Aave\"\n💸 **Send assets** — \"Send 0.001 ETH to 0x...\"\n\nJust ask naturally!",
    };
  }

  return {
    action: "clarify",
    message:
      "I'm not sure what you'd like to do. I can check your balance, swap tokens (USDC ↔ ETH), or manage staking on Aave. What would you like?",
  };
}

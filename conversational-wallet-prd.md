# PRD: Conversational Wallet App (MVP)

> **For Cursor / Vibe Coding** — Read this top to bottom before touching any code. Each section is designed to give you enough context to build confidently without over-engineering.

---

## 1. What We're Building

A **chat-first crypto wallet** where users manage their assets by talking, not clicking through dashboards. The UI is a single chat thread. The user types a message, an AI understands the intent, confirms the action, executes it on-chain, and replies with the result — all inside the same conversation.

**One-liner for the README:**
> "Your crypto wallet that you talk to."

---

## 2. Tech Stack & Key Dependencies

### Core AI Layer — Venice AI

Venice is the **privacy-preserving, uncensored LLM API** that powers intent parsing. We use it instead of OpenAI/Anthropic for the following reasons:

- Requests are processed without logging user financial data
- Supports tool/function calling (we use this for structured intent extraction)
- On-chain native — built for Web3 use cases

**How we use Venice:**
1. Every user message is sent to Venice with a **system prompt** that defines the wallet's capabilities (check balance, swap, stake)
2. Venice returns a **structured JSON intent** (not freeform text) using its function-calling interface
3. We use that JSON to trigger the appropriate on-chain action

**Venice API basics:**
```
Base URL: https://api.venice.ai/api/v1
Auth: Bearer token (VENICE_API_KEY in .env)
Model: venice-uncensored (or latest recommended model for function calling)
Endpoint: POST /chat/completions  ← same shape as OpenAI API
```

**Intent schema Venice must return:**
```typescript
type WalletIntent =
  | { action: "check_balance"; token?: string }
  | { action: "check_history"; limit?: number }
  | { action: "check_staking" }
  | { action: "swap"; from_token: string; to_token: string; amount: number; amount_in_usd: boolean }
  | { action: "stake"; token: string; amount: number; protocol: string }
  | { action: "unstake"; token?: string; protocol?: string; amount?: "all" | number }
  | { action: "clarify"; message: string }  // Venice asks user to be more specific
```

---

### Gasless Execution — x402 Protocol

x402 is an **HTTP-based payment protocol** (inspired by the HTTP 402 status code) that enables machine-to-machine micropayments and gasless transactions. It acts as the payment rail between our wallet app and on-chain DeFi actions.

**How x402 fits in our flow:**
- When Venice confirms an intent (e.g., "swap $50 USDC to ETH"), we construct a **signed x402 payment request**
- The x402 facilitator (a hosted relay service) receives the signed request and broadcasts the transaction
- This means **users never need ETH for gas** — the facilitator covers it (fees abstracted)

**Key concepts for implementation:**
- x402 uses standard HTTP headers: `X-Payment`, `X-Payment-Scheme`, `X-Payment-Recipient`
- Our app signs requests using the user's wallet private key (via Viem or Ethers.js)
- The facilitator endpoint validates the signature and executes the transaction

**x402 flow for a swap:**
```
1. Build swap payload (from, to, amount, slippage)
2. Sign with user's EOA or smart account
3. POST to x402 facilitator endpoint with signed headers
4. Facilitator executes on-chain (gasless for user)
5. Response includes tx hash → display in chat
```

> **Note for MVP:** Use the x402 testnet facilitator. Swap to production endpoint before mainnet launch.

---

### Account Abstraction — EIP-7710 & EIP-7715

These two EIPs are the backbone of **delegated, permission-based transaction execution**. Together they allow our app to execute transactions on behalf of the user without requiring them to sign every single action.

#### EIP-7710 — Smart Account Delegation

EIP-7710 introduces **delegation-based execution** for smart contract accounts. A user can delegate specific permissions to a delegate (our app's execution contract) without giving away full account control.

**What this means in practice:**
- User connects wallet once and signs a **delegation certificate**
- The certificate specifies: what actions are allowed, spending limits, time window
- Our backend holds this certificate and uses it to execute approved actions
- User does not need to be online or manually approve every tx

**Implementation steps:**
```
1. User connects wallet (MetaMask, Coinbase Wallet, etc.)
2. App prompts user to sign a delegation via EIP-7710
3. Delegation is stored server-side (encrypted, per-session)
4. On confirmed intent → use delegation to execute via smart account
```

**Delegation cert shape (simplified):**
```solidity
struct Delegation {
  address delegate;       // our execution contract
  bytes32[] permissions;  // e.g., SWAP, STAKE
  uint256 spendingLimit;  // max USDC per tx (in wei)
  uint256 expiresAt;      // unix timestamp
}
```

#### EIP-7715 — Permission Scoping (wallet_grantPermissions)

EIP-7715 defines the `wallet_grantPermissions` RPC method, which lets dApps **request granular, scoped permissions** from the user's wallet at connection time.

**What this means in practice:**
- At onboarding, we call `wallet_grantPermissions` with a tight permission set
- User sees exactly what they're authorizing (e.g., "Swap up to $500 USDC/day")
- Wallet returns a **permission context object** we attach to future requests
- Reduces friction — user approves once, not per-transaction

**Permission request shape:**
```javascript
const permissions = await walletClient.request({
  method: "wallet_grantPermissions",
  params: [{
    permissions: [
      {
        type: "native-token-transfer",
        data: { allowance: parseEther("0.1") }       // ETH spend limit
      },
      {
        type: "erc20-token-transfer",
        data: {
          address: USDC_ADDRESS,
          allowance: parseUnits("500", 6)              // USDC spend limit
        }
      }
    ],
    expiry: Math.floor(Date.now() / 1000) + 86400,    // 24h session
  }]
});
// Store permissions.context — attach to all subsequent requests
```

**EIP-7710 + EIP-7715 Together:**
```
EIP-7715  →  User grants scoped permissions at onboarding (what you CAN do)
EIP-7710  →  Delegation certificate lets you DO IT without re-prompting
```

Both EIPs are only partially supported in current wallets. For MVP, implement with fallback to manual approval if the wallet doesn't support these RPC methods. Check support with `wallet_getCapabilities`.

---

## 3. Feature Specifications

### Feature 1 — Check Account Details

**User triggers:** "What's my balance?", "Show my ETH balance", "Show recent transactions", "What am I staking?", "Am I making money?"

**Venice intent:**
```json
{ "action": "check_balance", "token": "ETH" }
{ "action": "check_history", "limit": 5 }
{ "action": "check_staking" }
```

**Data to fetch:**
| Data Point | Source |
|---|---|
| Token balances (ETH, USDC) | RPC call → `eth_getBalance` + ERC-20 `balanceOf` |
| Transaction history | Blockscout / Alchemy API (last 10 txns) |
| Staking positions | Protocol-specific read calls (e.g., Aave `getUserAccountData`) |
| P&L | Current balance vs. cost basis (store cost basis in local DB on deposit/swap) |

**Chat response format:**
```
💰 Your Wallet

ETH    0.42 ETH    (~$1,260)
USDC   500.00      ($500.00)

📊 Staking
Aave   100 USDC    APY: 4.2%   Earned: $1.20

📈 P&L (7d): +$42.10 (+3.2%)
```

---

### Feature 2 — Swap

**User triggers:** "Swap $50 USDC to ETH", "Exchange 0.1 ETH for USDC", "Convert 200 USDC to ETH"

**Supported pairs (MVP only):**
- USDC → ETH
- ETH → USDC

**Venice intent:**
```json
{
  "action": "swap",
  "from_token": "USDC",
  "to_token": "ETH",
  "amount": 50,
  "amount_in_usd": true
}
```

**Full execution flow:**
```
1. Venice parses intent → returns swap JSON
2. App fetches live quote from DEX aggregator (1inch or Uniswap SDK)
3. App sends confirmation message to chat:
   "Swap 50 USDC → ~0.0166 ETH (rate: $3,012/ETH, slippage: 0.5%). Confirm?"
4. User replies "yes" / "confirm" / "do it"
5. App signs x402 payment request with EIP-7710 delegation
6. x402 facilitator executes the swap (gasless)
7. App polls for tx confirmation
8. Chat message: "✅ Done! Swapped 50 USDC for 0.01658 ETH. Tx: 0xabc...123"
```

**Error states to handle in chat:**
- Insufficient balance → "You only have 30 USDC. Swap 30 instead?"
- Slippage too high → "Price moved. New quote: X ETH. Still confirm?"
- Tx failed → "Swap failed (gas spike). Try again?"

**Confirmation timeout:** If user doesn't confirm within 30 seconds, cancel and say "Quote expired. Say 'swap' again to get a fresh quote."

---

### Feature 3 — Staking

**User triggers:** "Stake 100 USDC to Aave", "Stake my USDC", "Unstake everything", "Withdraw from Aave"

**Supported protocol (MVP only):** Aave v3 on Base

**Venice intent:**
```json
{ "action": "stake", "token": "USDC", "amount": 100, "protocol": "aave" }
{ "action": "unstake", "token": "USDC", "protocol": "aave", "amount": "all" }
```

**Stake flow:**
```
1. Venice returns stake intent
2. App fetches current Aave APY (from Aave API or on-chain)
3. Confirmation message:
   "Stake 100 USDC to Aave. Current APY: 4.2% (~$4.20/year). Confirm?"
4. User confirms
5. App calls Aave `supply()` via x402 + EIP-7710 delegation
6. Chat: "✅ Staked! 100 USDC deposited to Aave. You're now earning 4.2% APY."
```

**Unstake flow:**
```
1. Venice returns unstake intent
2. App fetches current staking balance + accrued interest
3. Confirmation message:
   "Withdraw 100 USDC + $1.20 earned interest from Aave. Confirm?"
4. User confirms
5. App calls Aave `withdraw()` via x402 + EIP-7710 delegation
6. Chat: "✅ Withdrawn! 101.20 USDC returned to your wallet."
```

---

## 4. Conversation State Machine

Every conversation session has a state. The app uses this to handle multi-turn interactions (like waiting for confirmation).

```typescript
type ConversationState =
  | { status: "idle" }
  | { status: "awaiting_confirmation"; pendingAction: WalletIntent; quoteData: QuoteData; expiresAt: number }
  | { status: "executing"; txHash?: string }
  | { status: "error"; message: string }
```

**State transitions:**
```
idle → (user message) → Venice parsing
Venice parsing → (intent returned) → awaiting_confirmation (if action needed)
Venice parsing → (informational only) → idle (just show data, no confirmation)
awaiting_confirmation → (user says yes) → executing
awaiting_confirmation → (user says no / timeout) → idle
executing → (tx confirmed) → idle
executing → (tx failed) → error → idle
```

**Confirmation detection:** After sending a confirmation message, check next user message for:
- Positive: "yes", "confirm", "do it", "go ahead", "yep", "sure", "ok"
- Negative: "no", "cancel", "stop", "nevermind", "nope", "abort"
- If neither: pass back to Venice for re-interpretation (user might be saying something else)

---

## 5. Project Structure

```
/
├── app/
│   ├── page.tsx                  # Main chat UI
│   ├── api/
│   │   ├── chat/route.ts         # POST /api/chat — Venice + state machine
│   │   ├── balance/route.ts      # GET /api/balance — fetch token balances
│   │   ├── history/route.ts      # GET /api/history — tx history
│   │   ├── quote/route.ts        # GET /api/quote — DEX swap quote
│   │   └── execute/route.ts      # POST /api/execute — x402 + delegation exec
├── lib/
│   ├── venice.ts                 # Venice AI client + intent parsing
│   ├── x402.ts                   # x402 request builder + signing
│   ├── delegation.ts             # EIP-7710 delegation cert management
│   ├── permissions.ts            # EIP-7715 wallet_grantPermissions helpers
│   ├── aave.ts                   # Aave v3 read/write helpers
│   ├── onchain.ts                # Generic RPC helpers (balance, history)
│   └── state.ts                  # Conversation state machine
├── components/
│   ├── Chat.tsx                  # Chat thread component
│   ├── Message.tsx               # Individual message bubble
│   ├── ConfirmationCard.tsx      # Inline swap/stake confirmation UI
│   └── WalletConnect.tsx         # Wallet connection + EIP-7715 onboarding
├── hooks/
│   ├── useWallet.ts              # Wallet state (address, chain, balances)
│   └── useConversation.ts        # Chat state management
├── constants/
│   └── tokens.ts                 # USDC_ADDRESS, ETH, supported tokens
└── .env.local
    ├── VENICE_API_KEY
    ├── X402_FACILITATOR_URL
    ├── ALCHEMY_API_KEY
    └── NEXT_PUBLIC_CHAIN_ID      # 8453 for Base mainnet
```

---

## 6. Venice AI Integration — Implementation Detail

```typescript
// lib/venice.ts

const VENICE_BASE_URL = "https://api.venice.ai/api/v1";

const SYSTEM_PROMPT = `
You are an AI assistant embedded in a crypto wallet app.
The user can ask you to:
1. Check their balance, transaction history, or staking positions
2. Swap between USDC and ETH
3. Stake USDC to Aave or unstake from Aave

Always respond ONLY with a valid JSON object matching the WalletIntent type.
Never respond with natural language. Never explain. Only JSON.

If the user's message is unclear, return:
{ "action": "clarify", "message": "What would you like to do? I can check your balance, swap tokens, or manage staking." }

Supported tokens: ETH, USDC
Supported protocols: aave
`;

export async function parseIntent(userMessage: string): Promise<WalletIntent> {
  const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VENICE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "venice-uncensored",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },  // enforce JSON output
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content) as WalletIntent;
}
```

---

## 7. x402 Integration — Implementation Detail

```typescript
// lib/x402.ts
// x402 turns on-chain actions into signed HTTP requests executed by a facilitator

export async function executeSwapViaX402(params: {
  fromToken: string;
  toToken: string;
  amount: bigint;
  walletClient: WalletClient;
  permissionsContext: string;   // from EIP-7715
}) {
  const payload = {
    type: "swap",
    fromToken: params.fromToken,
    toToken: params.toToken,
    amount: params.amount.toString(),
    permissionsContext: params.permissionsContext,
  };

  // Sign the payload using EIP-712 typed data
  const signature = await params.walletClient.signTypedData({
    domain: X402_DOMAIN,
    types: X402_TYPES,
    primaryType: "SwapRequest",
    message: payload,
  });

  // Submit to x402 facilitator
  const response = await fetch(`${process.env.X402_FACILITATOR_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment-Scheme": "x402",
      "X-Payment": signature,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "x402 execution failed");
  return { txHash: result.txHash };
}
```

---

## 8. EIP-7710 & EIP-7715 — Implementation Detail

```typescript
// lib/permissions.ts — EIP-7715 onboarding

export async function requestWalletPermissions(walletClient: WalletClient) {
  // Check if wallet supports EIP-7715
  const capabilities = await walletClient.request({
    method: "wallet_getCapabilities",
    params: [walletClient.account.address],
  }).catch(() => null);

  if (!capabilities?.permissions) {
    // Fallback: manual approval per transaction
    return { context: null, fallback: true };
  }

  const permissions = await walletClient.request({
    method: "wallet_grantPermissions",
    params: [{
      permissions: [
        {
          type: "erc20-token-transfer",
          data: {
            address: USDC_ADDRESS,
            allowance: parseUnits("1000", 6),   // $1000 USDC daily limit
          },
        },
        {
          type: "native-token-transfer",
          data: {
            allowance: parseEther("0.5"),         // 0.5 ETH limit
          },
        },
      ],
      expiry: Math.floor(Date.now() / 1000) + 86400,  // 24h
    }],
  });

  return { context: permissions.context, fallback: false };
}
```

```typescript
// lib/delegation.ts — EIP-7710 delegation

export async function createDelegation(walletClient: WalletClient) {
  // Check if wallet supports EIP-7710 delegation
  const capabilities = await walletClient.request({
    method: "wallet_getCapabilities",
    params: [walletClient.account.address],
  }).catch(() => null);

  if (!capabilities?.delegation) {
    return { delegation: null, fallback: true };
  }

  // Request delegation for swap + stake actions only
  const delegation = await walletClient.request({
    method: "wallet_createSession",  // EIP-7710 method
    params: [{
      chainId: BASE_CHAIN_ID,
      delegate: EXECUTION_CONTRACT_ADDRESS,
      permissions: ["SWAP", "STAKE", "READ"],
      spendingLimit: parseUnits("1000", 6),     // max $1000 USDC per session
      expiresAt: Math.floor(Date.now() / 1000) + 3600,  // 1h session
    }],
  });

  return { delegation: delegation.certificate, fallback: false };
}
```

**Important:** Store the `permissionsContext` (7715) and `delegation` (7710) in session state (not localStorage). Both are needed for every execution call.

---

## 9. Chat API Route — Putting It All Together

```typescript
// app/api/chat/route.ts

export async function POST(req: Request) {
  const { message, state, walletAddress } = await req.json();

  // Step 1: If we're awaiting confirmation, check if this is a yes/no
  if (state.status === "awaiting_confirmation") {
    const isConfirm = /^(yes|confirm|do it|go ahead|yep|sure|ok|y)$/i.test(message.trim());
    const isCancel = /^(no|cancel|stop|nevermind|nope|abort|n)$/i.test(message.trim());

    if (isConfirm) {
      // Execute the pending action
      const result = await executeAction(state.pendingAction, walletAddress);
      return Response.json({
        reply: formatSuccessMessage(result),
        newState: { status: "idle" },
      });
    }

    if (isCancel) {
      return Response.json({
        reply: "Cancelled. What else can I help you with?",
        newState: { status: "idle" },
      });
    }
    // If neither, fall through to Venice (user said something else)
  }

  // Step 2: Parse intent via Venice
  const intent = await parseIntent(message);

  // Step 3: Handle informational intents (no confirmation needed)
  if (intent.action === "check_balance") {
    const balances = await fetchBalances(walletAddress);
    return Response.json({
      reply: formatBalanceMessage(balances),
      newState: { status: "idle" },
    });
  }

  if (intent.action === "check_history") { /* ... */ }
  if (intent.action === "check_staking") { /* ... */ }
  if (intent.action === "clarify") {
    return Response.json({ reply: intent.message, newState: { status: "idle" } });
  }

  // Step 4: For action intents, fetch quote and request confirmation
  if (intent.action === "swap") {
    const quote = await getSwapQuote(intent);
    const confirmMsg = formatSwapConfirmation(intent, quote);
    return Response.json({
      reply: confirmMsg,
      newState: {
        status: "awaiting_confirmation",
        pendingAction: intent,
        quoteData: quote,
        expiresAt: Date.now() + 30_000,
      },
    });
  }

  if (intent.action === "stake" || intent.action === "unstake") {
    const apy = await getAaveAPY();
    const confirmMsg = formatStakeConfirmation(intent, apy);
    return Response.json({
      reply: confirmMsg,
      newState: {
        status: "awaiting_confirmation",
        pendingAction: intent,
        quoteData: { apy },
        expiresAt: Date.now() + 30_000,
      },
    });
  }
}
```

---

## 10. UI Spec

**Stack:** Next.js 14+ (App Router), Tailwind CSS, Viem, Wagmi

**Layout:** Single-page, full-height chat interface. No nav, no sidebar. Just the chat.

**Components:**

`Chat.tsx` — scrollable message list + input bar at bottom
- Messages appear from bottom up (newest at bottom)
- Auto-scroll on new message
- Input: plain text input + Send button
- Loading state: "Thinking..." bubble while Venice parses

`Message.tsx` — individual message bubble
- User messages: right-aligned, dark background
- App messages: left-aligned, light background
- Support inline formatting (bold for numbers, monospace for addresses)

`ConfirmationCard.tsx` — shown inline in the chat for action confirmations
- Not a modal — renders as a chat message with a structured card
- Shows: action summary, key numbers, countdown timer
- Buttons: "Confirm" / "Cancel" (in addition to typing yes/no)

`WalletConnect.tsx` — shown only on first load
- "Connect Wallet" button (Wagmi's ConnectButton or custom)
- After connection: automatically calls `wallet_grantPermissions` (EIP-7715)
- Shows brief "Setting up your session..." during permission grant
- On success: transitions to chat

---

## 11. Environment Variables

```bash
# .env.local

# Venice AI
VENICE_API_KEY=your_venice_api_key_here

# x402 Protocol
X402_FACILITATOR_URL=https://facilitator.x402.org   # or testnet equivalent

# RPC / Indexer
ALCHEMY_API_KEY=your_alchemy_key_here
NEXT_PUBLIC_RPC_URL=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}

# Chain
NEXT_PUBLIC_CHAIN_ID=8453   # Base mainnet (84532 for Base Sepolia testnet)

# Smart Contracts (Base mainnet)
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_AAVE_POOL_ADDRESS=0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
NEXT_PUBLIC_EXECUTION_CONTRACT_ADDRESS=your_eip7710_delegate_contract_address
```

---

## 12. What's Out of Scope (MVP)

Do not build these. Mention them in comments at most.

| Feature | Reason Deferred |
|---|---|
| Multi-chain support | Adds routing complexity; Base only for MVP |
| Complex yield strategies | Stick to Aave v3 supply only |
| Portfolio analytics / charts | Needs historical price data pipeline |
| Limit orders | Requires background job infrastructure |
| Token price alerts | Same as above |
| Mobile app | Web-first; responsive design is acceptable |
| Social / sharing | Out of scope for wallet MVP |

---

## 13. Launch Checklist

- [ ] Venice intent parsing returns valid JSON for all 7 intent types
- [ ] Confirmation flow works: send quote → user says yes → execute → success message
- [ ] Swap (USDC→ETH and ETH→USDC) works end-to-end on Base Sepolia
- [ ] Stake to Aave works on Base Sepolia
- [ ] Unstake from Aave works on Base Sepolia
- [ ] Balance display shows ETH + USDC + staking position
- [ ] Transaction history shows last 5 txns
- [ ] EIP-7715 permission request runs at wallet connect
- [ ] EIP-7710 delegation fallback (manual approval) works when wallet doesn't support it
- [ ] x402 gasless execution works on testnet
- [ ] Quote expiry (30s) handled gracefully in chat
- [ ] Error states (insufficient balance, failed tx) show user-friendly messages
- [ ] No hardcoded private keys anywhere

---

## 14. Glossary

| Term | What It Means Here |
|---|---|
| **Venice AI** | The LLM API we use for intent parsing. Privacy-focused, OpenAI-compatible API. |
| **x402** | HTTP-based payment protocol for gasless, signed on-chain execution via a facilitator relay. |
| **EIP-7710** | Ethereum standard for smart account delegation — lets our app execute txns using a signed certificate without re-prompting the user each time. |
| **EIP-7715** | Ethereum standard (`wallet_grantPermissions`) for requesting scoped, time-limited spending permissions from the user's wallet at session start. |
| **Intent** | The structured JSON object Venice returns after parsing a user message. Represents what the user wants to do. |
| **Facilitator** | The x402 server that receives our signed requests and broadcasts them on-chain, covering gas fees. |
| **Delegation certificate** | Signed artifact from EIP-7710 that authorizes our execution contract to act on the user's behalf within defined limits. |
| **Permissions context** | Opaque string returned by `wallet_grantPermissions` (EIP-7715) that wallets use to authorize bundled transactions. |
| **Base** | The L2 chain we deploy on (Coinbase's OP Stack chain). Cheap gas, good liquidity, Aave v3 supported. |

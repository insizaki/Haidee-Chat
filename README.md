# Haidee

Haidee is a conversational crypto wallet: **your crypto wallet that you talk to**.

Instead of navigating wallet dashboards, users connect a wallet and type natural-language requests like:

- "What's my balance?"
- "Show my recent transactions"
- "Swap $50 USDC to ETH"
- "Stake 100 USDC to Aave"
- "Unstake everything from Aave"
- "Send 0.001 ETH to 0x..."

Haidee parses the user's intent, shows a confirmation for transactional actions, and then executes or simulates the action through the wallet execution layer.

## Problem

Crypto wallets are still hard for normal users. Even simple actions require users to understand networks, tokens, gas, approvals, DeFi protocols, slippage, and transaction prompts.

That complexity creates three major issues:

- Users are afraid of making mistakes.
- DeFi actions take too many manual steps.
- Wallet UX feels technical instead of conversational.

Haidee reduces that friction by turning wallet actions into a chat workflow.

## Solution

Haidee provides a chat-first wallet interface powered by structured AI intent parsing.

The app takes a user message, converts it into a wallet intent, fetches any required on-chain data or quote, asks the user to confirm risky actions, and returns the result in the same chat thread.

Supported MVP flows:

- Check ETH and USDC balances
- View transaction history
- View Aave staking position
- Swap ETH and USDC
- Stake USDC to Aave
- Unstake USDC from Aave
- Transfer ETH or USDC
- Fall back to local regex parsing when no AI API key is configured

## Key Innovation

Haidee combines natural-language wallet commands with a permissioned execution architecture.

The project is designed around:

- **AI intent parsing** for converting user messages into structured wallet actions
- **x402-style gasless execution** for facilitator-based transaction execution
- **EIP-7715 permissions** for scoped wallet session authorization
- **EIP-7710 delegation** for approved action execution without repeated prompts
- **Fallback mode** for wallets that do not support advanced permission APIs yet

In the current MVP, real reads are implemented where possible, while execution routes can return mock transaction hashes during development.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Wagmi
- RainbowKit
- Viem
- TanStack Query
- MetaMask Smart Accounts Kit

## Project Structure

```text
app/
  api/
    balance/route.ts    Balance endpoint
    chat/route.ts       Main chat orchestrator
    execute/route.ts    Reserved execution endpoint
    history/route.ts    Transaction history endpoint
    quote/route.ts      Quote endpoint
  layout.tsx
  page.tsx

components/
  Chat.tsx              Main chat UI
  ConfirmationCard.tsx  Inline confirmation UI
  Message.tsx           Chat message renderer
  WagmiProvider.tsx     Wallet provider setup
  WalletConnect.tsx     Wallet connection screen

hooks/
  useConversation.ts    Chat state and API calls
  useWallet.ts          Wallet connection and session setup

lib/
  aave.ts               Quote and Aave helper logic
  delegation.ts         EIP-7710 session delegation helper
  format.ts             Chat response formatting
  onchain.ts            Balance, history, and staking reads
  permissions.ts        EIP-7715 permission helper
  state.ts              Confirmation state helpers
  venice.ts             AI intent parser and fallback parser
  x402.ts               x402 request signing helpers

constants/
  tokens.ts             Chain, token, protocol, and EIP-712 constants
```

## Requirements

- Node.js 20 or newer
- pnpm, npm, yarn, or bun
- A browser wallet such as MetaMask
- Base Sepolia testnet configured in the wallet

The project is configured for **Base Sepolia** by default.

## Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

If there is no `.env.example`, create `.env.local` manually:

```env
# Optional AI provider key.
# The app uses GROQ_API_KEY first, then VENICE_API_KEY.
# If neither is set, Haidee uses the local fallback parser.
GROQ_API_KEY=
VENICE_API_KEY=

# Optional RPC.
# If omitted, the app uses an Alchemy Base Sepolia URL with ALCHEMY_API_KEY or demo fallback.
NEXT_PUBLIC_RPC_URL=
ALCHEMY_API_KEY=

# Optional x402 facilitator.
# If omitted, execution helpers return mock transaction hashes for development.
X402_FACILITATOR_URL=

# Base Sepolia
NEXT_PUBLIC_CHAIN_ID=84532
```

Notes:

- `GROQ_API_KEY` currently works with the OpenAI-compatible endpoint in `lib/venice.ts`.
- `VENICE_API_KEY` is also supported by the code path, but the current base URL points to Groq-compatible chat completions.
- On-chain execution is still MVP-oriented. Some flows intentionally return mock transaction hashes when external services are not configured.

## Installation

Install dependencies:

```bash
pnpm install
```

Or use another package manager:

```bash
npm install
```

## Run Locally

Start the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Connect your wallet, switch to Base Sepolia if needed, and start chatting with Haidee.

## Tutorial

### 1. Connect Wallet

Open the app and click **Connect Wallet**.

Haidee will try to set up a session using permission and delegation helpers:

- `wallet_grantPermissions` style permissions through `lib/permissions.ts`
- `wallet_createSession` style delegation through `lib/delegation.ts`

If the wallet does not support these methods, the app enters fallback/manual mode.

### 2. Ask for Balance

Try:

```text
What's my balance?
```

Haidee calls the chat API, parses the intent as `check_balance`, reads ETH and USDC balances, and returns a formatted wallet summary.

### 3. Ask for Transaction History

Try:

```text
Show my last 5 transactions
```

Haidee attempts to fetch Base Sepolia transaction history through Alchemy. If no API key is configured, it returns development mock data.

### 4. Ask About Staking

Try:

```text
What am I staking?
```

Haidee checks the user's Aave-related position and formats the result. If the on-chain read fails during development, it returns mock staking data.

### 5. Request a Swap

Try:

```text
Swap $50 USDC to ETH
```

Flow:

1. The message is parsed into a `swap` intent.
2. Haidee fetches a quote.
3. Haidee shows a confirmation card.
4. The user confirms or cancels.
5. The MVP execution path returns a transaction-style success response.

Confirm with:

```text
yes
```

Cancel with:

```text
cancel
```

### 6. Stake to Aave

Try:

```text
Stake 100 USDC to Aave
```

Haidee creates a staking confirmation using the Aave helper logic. After confirmation, the MVP execution flow returns a success response.

### 7. Send Assets

Try:

```text
Send 0.001 ETH to 0x0000000000000000000000000000000000000000
```

Haidee validates the token, amount, and recipient address, then asks for confirmation before execution.

## Chat Flow

The main orchestration lives in `app/api/chat/route.ts`.

The flow is:

```text
User message
  -> parse intent
  -> if informational: fetch data and reply
  -> if transactional: fetch quote and ask for confirmation
  -> if confirmed: execute action
  -> return updated conversation state
```

Conversation states:

- `idle`
- `awaiting_confirmation`
- `executing`
- `error`

Confirmations expire after the quote timeout defined in `lib/state.ts`.

## Development Commands

```bash
pnpm dev
```

Run the local development server.

```bash
pnpm build
```

Create a production build.

```bash
pnpm start
```

Start the production server after building.

```bash
pnpm lint
```

Run ESLint.

## Current MVP Limitations

- Some execution paths are mocked for development.
- x402 facilitator integration requires a real facilitator URL.
- EIP-7710 and EIP-7715 support depends on wallet capability.
- Aave APY and some price values are mocked or simplified.
- Transaction history requires an Alchemy key for real data.
- The app currently supports ETH and USDC on Base Sepolia.

## Pitch

Haidee turns crypto wallets from technical dashboards into intelligent financial assistants. Users can manage balances, swaps, transfers, and DeFi positions through simple conversation while still keeping control through confirmations, spending limits, and session-based permissions.

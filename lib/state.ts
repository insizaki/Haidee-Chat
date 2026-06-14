// =============================================================================
// Conversation State Machine — Confirmation Detection & Transitions
// =============================================================================

import type { ConversationState } from "@/types";

// -----------------------------------------------------------------------------
// Confirmation / Cancellation Detection
// -----------------------------------------------------------------------------

const POSITIVE_PATTERNS =
  /^(yes|confirm|do it|go ahead|yep|sure|ok|y|yeah|let's go|approved|let's do it|proceed)$/i;

const NEGATIVE_PATTERNS =
  /^(no|cancel|stop|nevermind|nope|abort|n|nah|don't|never mind|skip|forget it)$/i;

/**
 * Check if a message is a confirmation (user saying "yes").
 */
export function isConfirmation(message: string): boolean {
  return POSITIVE_PATTERNS.test(message.trim());
}

/**
 * Check if a message is a cancellation (user saying "no").
 */
export function isCancellation(message: string): boolean {
  return NEGATIVE_PATTERNS.test(message.trim());
}

// -----------------------------------------------------------------------------
// Quote Expiry
// -----------------------------------------------------------------------------

/** Quote validity window: 30 seconds (from PRD §4) */
export const QUOTE_EXPIRY_MS = 30_000;

/**
 * Check if a pending quote has expired.
 */
export function isQuoteExpired(state: ConversationState): boolean {
  if (state.status !== "awaiting_confirmation") return false;
  return Date.now() > state.expiresAt;
}

/**
 * Get remaining seconds on a quote before it expires.
 */
export function getQuoteRemainingSeconds(state: ConversationState): number {
  if (state.status !== "awaiting_confirmation") return 0;
  const remaining = Math.max(0, state.expiresAt - Date.now());
  return Math.ceil(remaining / 1000);
}

// -----------------------------------------------------------------------------
// State Transitions
// -----------------------------------------------------------------------------

export function createIdleState(): ConversationState {
  return { status: "idle" };
}

export function createErrorState(message: string): ConversationState {
  return { status: "error", message };
}

export function createExecutingState(txHash?: string): ConversationState {
  return { status: "executing", txHash };
}

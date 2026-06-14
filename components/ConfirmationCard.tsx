"use client";

// =============================================================================
// ConfirmationCard — Inline Swap/Stake Confirmation UI
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types";

interface ConfirmationCardProps {
  data: NonNullable<ChatMessage["confirmationData"]>;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ConfirmationCard({
  data,
  onConfirm,
  onCancel,
}: ConfirmationCardProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000))
  );
  const [isExpired, setIsExpired] = useState(false);
  const [isActioned, setIsActioned] = useState(false);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((data.expiresAt - Date.now()) / 1000)
      );
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data.expiresAt]);

  const handleConfirm = useCallback(() => {
    if (isExpired || isActioned) return;
    setIsActioned(true);
    onConfirm?.();
  }, [isExpired, isActioned, onConfirm]);

  const handleCancel = useCallback(() => {
    if (isExpired || isActioned) return;
    setIsActioned(true);
    onCancel?.();
  }, [isExpired, isActioned, onCancel]);

  const disabled = isExpired || isActioned;

  // Determine action type label
  const actionLabel =
    data.action.action === "swap"
      ? "Swap"
      : data.action.action === "stake"
        ? "Stake"
        : data.action.action === "unstake"
          ? "Unstake"
          : "Transfer";

  // Progress for countdown ring (0 to 1)
  const progress = remainingSeconds / 30;
  const circumference = 2 * Math.PI * 16;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={`confirmation-card rounded-xl border p-4 transition-all duration-300 ${
        disabled
          ? "border-white/5 bg-white/[0.03] opacity-60"
          : "border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-violet-500/10"
      }`}
    >
      {/* Header with countdown */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">
          {actionLabel} Confirmation
        </span>

        {!disabled && (
          <div className="flex items-center gap-1.5">
            {/* Countdown ring */}
            <svg width="24" height="24" className="-rotate-90">
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/10"
              />
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={2 * Math.PI * 8}
                strokeDashoffset={
                  (2 * Math.PI * 8) * (1 - progress)
                }
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  remainingSeconds <= 10
                    ? "text-red-400"
                    : "text-indigo-400"
                }`}
              />
            </svg>
            <span
              className={`text-xs font-mono ${
                remainingSeconds <= 10
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              {remainingSeconds}s
            </span>
          </div>
        )}

        {isExpired && (
          <span className="text-xs text-red-400">Expired</span>
        )}
      </div>

      {/* Quote details */}
      <div className="mb-4 space-y-1.5">
        {data.action.action === "transfer" && (
          <div className="flex flex-col gap-1 text-sm text-left">
            <div className="text-gray-300">
              Send <span className="font-semibold text-white">{data.action.amount} {data.action.token}</span>
            </div>
            <div className="text-xs text-gray-500 truncate">
              To: <span className="font-mono text-gray-300">{data.action.recipient}</span>
            </div>
          </div>
        )}
        {data.quoteData.fromAmount && data.quoteData.toAmount && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-300">
              {data.quoteData.fromAmount} {data.quoteData.fromToken}
            </span>
            <span className="text-indigo-400">→</span>
            <span className="font-medium text-white">
              {data.quoteData.toAmount} {data.quoteData.toToken}
            </span>
          </div>
        )}
        {data.quoteData.rate && (
          <div className="text-xs text-gray-500">
            Rate: {data.quoteData.rate}
          </div>
        )}
        {data.quoteData.slippage !== undefined && (
          <div className="text-xs text-gray-500">
            Slippage: {data.quoteData.slippage}%
          </div>
        )}
        {data.quoteData.apy !== undefined && (
          <div className="text-xs text-gray-500">
            APY: {data.quoteData.apy}%
            {data.quoteData.earnedInterest &&
              ` (~$${data.quoteData.earnedInterest}/year)`}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          id="confirm-action-btn"
          onClick={handleConfirm}
          disabled={disabled}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
        >
          {isActioned && !isExpired ? "Confirming..." : "Confirm"}
        </button>
        <button
          id="cancel-action-btn"
          onClick={handleCancel}
          disabled={disabled}
          className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:border-white/20 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

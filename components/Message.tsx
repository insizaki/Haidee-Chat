"use client";

// =============================================================================
// Message — Individual Chat Message Bubble
// =============================================================================

import type { ReactNode } from "react";
import type { ChatMessage } from "@/types";
import { ConfirmationCard } from "./ConfirmationCard";

interface MessageProps {
  message: ChatMessage;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Render markdown-like formatting in message content.
 * Handles **bold**, `code`, and newlines.
 */
function formatContent(content: string) {
  const parts: ReactNode[] = [];
  const lines = content.split("\n");

  lines.forEach((line, lineIdx) => {
    // Process bold markers and inline code
    const segments = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    segments.forEach((segment, segIdx) => {
      const key = `${lineIdx}-${segIdx}`;

      if (segment.startsWith("**") && segment.endsWith("**")) {
        parts.push(
          <strong key={key} className="font-semibold">
            {segment.slice(2, -2)}
          </strong>
        );
      } else if (segment.startsWith("`") && segment.endsWith("`")) {
        parts.push(
          <code
            key={key}
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-indigo-300"
          >
            {segment.slice(1, -1)}
          </code>
        );
      } else {
        parts.push(<span key={key}>{segment}</span>);
      }
    });

    if (lineIdx < lines.length - 1) {
      parts.push(<br key={`br-${lineIdx}`} />);
    }
  });

  return parts;
}

export function Message({ message, onConfirm, onCancel }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`message-enter flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "order-1" : ""}`}>
        {/* Avatar + bubble */}
        <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
          {/* Avatar */}
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold bg-[#373737] text-white"
          >
            {isUser ? (
              "U"
            ) : (
              <img src="/logo.svg" alt="Haidee Logo" className="h-4 w-4 object-contain" />
            )}
          </div>

          {/* Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-[#373737] text-white rounded-br-md"
                : "glass-card text-gray-100 rounded-bl-md"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">
              {formatContent(message.content)}
            </div>
          </div>
        </div>

        {/* Confirmation card (inline, not a modal) */}
        {message.confirmationData && (
          <div className="mt-2 ml-9">
            <ConfirmationCard
              data={message.confirmationData}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

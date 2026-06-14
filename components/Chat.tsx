"use client";

// =============================================================================
// Chat — Main Chat Thread Component (Visual Redesign)
// =============================================================================

import { useState, type FormEvent, useRef, useEffect } from "react";
import { useDisconnect } from "wagmi";
import { Message } from "./Message";
import { useConversation } from "@/hooks/useConversation";

interface ChatProps {
  walletAddress: string;
  permissionsContext: string | null;
  delegationCert: string | null;
}

export function Chat({ walletAddress, permissionsContext, delegationCert }: ChatProps) {
  const { disconnect } = useDisconnect();
  const {
    messages,
    isLoading,
    scrollRef,
    sendMessage,
    handleConfirm,
    handleCancel,
  } = useConversation(walletAddress, permissionsContext);

  const [inputValue, setInputValue] = useState("");
  const [showNotice, setShowNotice] = useState(true);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleSuggestionClick = (suggestionText: string) => {
    if (isLoading) return;
    setInputValue(suggestionText);
    inputRef.current?.focus();
  };

  const handleQuickSend = (suggestionText: string) => {
    if (isLoading) return;
    sendMessage(suggestionText);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black font-sans text-white select-none">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover z-0 opacity-80 pointer-events-none"
        style={{ filter: "brightness(0.55)" }}
      >
        <source src="/11902813_1620_1080_15fps.mp4" type="video/mp4" />
      </video>

      {/* Dark & Glassy Gradients Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 z-0 pointer-events-none" />

      {/* Transparent Fixed Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-500/20">
            <img src="/logo.svg" alt="Haidee Logo" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Haidee</h1>
            <p className="text-[10px] text-gray-500">
              Your crypto wallet that you talk to
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Permission Status Indicator */}
          {permissionsContext ? (
            <div className="flex items-center gap-1 border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 rounded-full text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider uppercase">⚡ Session</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 rounded-full text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] font-bold tracking-wider uppercase">🔑 Manual</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="text-[10px] font-medium text-gray-400">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
          <button
            onClick={() => disconnect()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-95 cursor-pointer"
            title="Disconnect Wallet"
            id="disconnect-btn"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          /* Empty State — Centered layout as shown in the screenshot */
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center select-text">
            {/* Crossed Keys Logo */}
            <svg
              className="w-16 h-16 text-white/90 mb-4 animate-[float_4s_ease-in-out_infinite]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Key 1 (stem top-right to bottom-left) */}
              <circle cx="16" cy="8" r="3" />
              <path d="M14 10L6 18M9 15l-1.5-1.5M7 17l-1.5-1.5" />

              {/* Key 2 (stem top-left to bottom-right) */}
              <circle cx="8" cy="8" r="3" />
              <path d="M10 10L18 18M15 15l1.5-1.5M17 17l1.5-1.5" />
            </svg>

            {/* Heading */}
            <h2 className="text-3xl md:text-4xl font-normal text-white mb-8 select-text">
              What magic will you do today?
            </h2>

            {/* Get Pro Access Link */}
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium mb-3 cursor-pointer transition-colors"
            >
              <span>✨</span>
              <span>Get Pro Access</span>
            </button>

            {/* Premium Notice + Input Card Container */}
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl mb-8"
            >
              {/* Premium Notice Block */}
              {showNotice && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01] text-left">
                  <div className="flex items-start gap-4">
                    {/* Database / Coins Icon */}
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                      </svg>
                    </div>
                    {/* Label */}
                    <div>
                      <h4 className="text-xs font-semibold text-white/95 tracking-wide">
                        Enable Premium Image Models?
                      </h4>
                      <p className="text-[11px] text-white/45 mt-0.5 max-w-lg leading-relaxed select-text">
                        Get access to high quality pay-per-use models, like Nano Banana Pro, Grok Imagine High Quality (SOTA) and more.
                      </p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-500/10"
                    >
                      Enable
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotice(false)}
                      className="text-white/40 hover:text-white/80 cursor-pointer p-1 transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Text Input Row */}
              <div className="relative flex items-center px-4 py-3 bg-white/[0.01]">
                {/* Paperclip Button */}
                <button
                  type="button"
                  className="text-white/45 hover:text-white/85 p-2 cursor-pointer transition-colors"
                  title="Attach file"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {/* Input Text Box */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything privately..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/25 outline-none select-text disabled:opacity-50"
                />

                {/* Right widgets */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Model Selector Dropdown */}
                  <div
                    onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                    className="relative flex items-center gap-1 bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/70 hover:text-white/95 cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <span>🤖 Agent</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>

                    {agentDropdownOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-40 rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl backdrop-blur-md">
                        {["Agent (Default)", "Image Gen Model", "Text Analyzer"].map((option) => (
                          <div
                            key={option}
                            className="rounded-lg px-2.5 py-1.5 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all"
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Microphone / Send Action Button */}
                  {inputValue.trim() ? (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer shadow-md"
                      title="Voice input"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Bottom Row suggestion pills */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "Check your balance", icon: "🖼️", text: "What's my wallet balance?" },
                { label: "Send to asset", icon: "💸", text: "Send 1 ETH to Vitalik" },
                { label: "Portfolio insight", icon: "🔍", text: "Write a report about my wallet portfolio" },
                { label: "Surprise me", icon: "✨", text: "What pool are the best right now" },
              ].map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/70 hover:text-white hover:border-white/20 hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm shadow-black/10"
                >
                  <span className="text-[11px]">{suggestion.icon}</span>
                  <span className="font-medium">{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat State — Show message logs */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scroll-smooth px-6 py-6"
              id="chat-messages"
            >
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <Message
                    key={msg.id}
                    message={msg}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                  />
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-end gap-2 message-enter">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                      H
                    </div>
                    <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="thinking-dot h-2 w-2 rounded-full bg-indigo-400" />
                        <span
                          className="thinking-dot h-2 w-2 rounded-full bg-indigo-400"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="thinking-dot h-2 w-2 rounded-full bg-indigo-400"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Input Area */}
            <div className="border-t border-white/[0.04] p-4 bg-black/40 backdrop-blur-md flex flex-col items-center">
              {/* Get Pro Access Link */}
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium mb-3 cursor-pointer transition-colors"
              >
                <span>✨</span>
                <span>Get Pro Access</span>
              </button>

              <form
                onSubmit={handleSubmit}
                className="w-full max-w-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              >
                {/* Premium Notice Block */}
                {showNotice && (
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01] text-left">
                    <div className="flex items-start gap-4">
                      {/* Database / Coins Icon */}
                      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                        </svg>
                      </div>
                      {/* Label */}
                      <div>
                        <h4 className="text-xs font-semibold text-white/95 tracking-wide">
                          Enable Premium Image Models?
                        </h4>
                        <p className="text-[11px] text-white/45 mt-0.5 max-w-lg leading-relaxed select-text">
                          Get access to high quality pay-per-use models, like Nano Banana Pro, Grok Imagine High Quality (SOTA) and more.
                        </p>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-500/10"
                      >
                        Enable
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNotice(false)}
                        className="text-white/40 hover:text-white/80 cursor-pointer p-1 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Text Input Row */}
                <div className="relative flex items-center px-4 py-3 bg-white/[0.01]">
                  {/* Paperclip Button */}
                  <button
                    type="button"
                    className="text-white/45 hover:text-white/85 p-2 cursor-pointer transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>

                  {/* Input field */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me anything privately..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/25 outline-none select-text disabled:opacity-50"
                  />

                  {/* Right side widgets */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                      className="relative flex items-center gap-1 bg-white/[0.04] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white/70 hover:text-white/95 cursor-pointer hover:bg-white/10 transition-all"
                    >
                      <span>🤖 Agent</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>

                      {agentDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-40 rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-2xl backdrop-blur-md">
                          {["Agent (Default)", "Image Gen Model", "Text Analyzer"].map((option) => (
                            <div
                              key={option}
                              className="rounded-lg px-2.5 py-1.5 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all"
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit / Mic */}
                    {inputValue.trim() ? (
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer shadow-md"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer shadow-md"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

// =============================================================================
// WalletConnect — Wallet Connection Screen (Visual Redesign)
// =============================================================================

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/hooks/useWallet";

interface WalletConnectProps {
  onConnected?: () => void;
  wallet?: any;
}

export function WalletConnect({ onConnected, wallet }: WalletConnectProps) {
  const localWallet = useWallet();
  const activeWallet = wallet || localWallet;
  const { isSettingUp, isFallbackMode } = activeWallet;

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";

        return (
          <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans text-white select-none flex flex-col justify-between">
            {/* Background Video */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover z-0 opacity-80 pointer-events-none"
              style={{ filter: "brightness(0.55)" }}
            >
              <source src="/bg.mp4" type="video/mp4" />
            </video>

            {/* Dark & Glassy Gradients Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 z-0 pointer-events-none" />

            {/* Subtle Vertical Grid Lines */}
            <div className="absolute inset-0 flex justify-between z-0 pointer-events-none px-4 md:px-12">
              <div className="w-[1px] h-full bg-white/[0.03]" />
              <div className="w-[1px] h-full bg-white/[0.03] hidden sm:block" />
              <div className="w-[1px] h-full bg-white/[0.03] hidden md:block" />
              <div className="w-[1px] h-full bg-white/[0.03] hidden lg:block" />
              <div className="w-[1px] h-full bg-white/[0.03]" />
            </div>

            {/* Header (Navbar) */}
            <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Haidee Logo" className="h-6 w-6 object-contain" />
                <span className="text-xl font-medium tracking-widest text-white/95">Haidee</span>
                <span className="text-[10px] font-semibold text-white/70 align-super select-none">TM</span>
              </div>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-white/60">
                {["Features", "EIP-7715", "x402", "Venice AI", "Security"].map((link) => (
                  <span
                    key={link}
                    className="hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    {link}
                  </span>
                ))}
              </nav>

              {/* Action Buttons */}
              <div className="flex items-center gap-6">
                {/* <button
                  onClick={openConnectModal}
                  disabled={!ready}
                  className="text-xs font-semibold tracking-wide text-white/80 hover:text-white transition-colors duration-200 cursor-pointer disabled:opacity-50"
                >
                  Sign in
                </button> */}
                <button
                  onClick={openConnectModal}
                  disabled={!ready}
                  className="bg-white text-black font-semibold text-xs tracking-wider px-6 py-2.5 rounded-full hover:bg-neutral-200 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 disabled:opacity-50"
                >
                  Connect Wallet
                </button>
              </div>
            </header>

            {/* Hero Section */}
            <main className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-12 max-w-4xl">
              {/* Subheading with thin red prefix line */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-[1px] bg-red-500/70" />
                <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-white/50">
                  Conversational Smart Accounts with Session Permissions
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight text-white leading-[1.08] mb-6 select-text">
                Your crypto wallet<br />
                <span className="font-normal">that you talk to</span>
              </h1>

              {/* Start Chat Button */}
              <button
                onClick={openConnectModal}
                disabled={!ready}
                className="self-start mb-8 bg-white hover:bg-neutral-200 text-black font-semibold text-sm tracking-wider px-8 py-3.5 rounded-full active:scale-95 transition-all duration-200 cursor-pointer shadow-xl shadow-white/5 disabled:opacity-50 inline-flex items-center gap-2"
              >
                Start Chat
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              {/* Notices (Setting Up / Fallback) */}
              {isSettingUp && (
                <div className="self-start flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md animate-pulse">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white/30 border-t-white" />
                  <span className="text-xs tracking-wide text-white/80">
                    Setting up your wallet session...
                  </span>
                </div>
              )}
              {isFallbackMode && !isSettingUp && (
                <div className="self-start rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 backdrop-blur-md">
                  <span className="text-xs text-amber-300 tracking-wide">
                    Manual Mode: Approvals will prompt per txn
                  </span>
                </div>
              )}
            </main>

            {/* Bottom Stats Grid */}
            <footer className="relative z-10 px-6 py-8 md:px-12 md:py-12 border-t border-white/[0.03]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-16 max-w-3xl">
                {[
                  { value: "Gasless", label: "micropayments via x402" },
                  { value: "One-Click", label: "delegated session execution" },
                  { value: "Private", label: "zero-log Venice AI interface" },
                ].map((stat, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-3xl md:text-4xl font-normal tracking-tight text-white select-text">
                      {stat.value}
                    </span>
                    <span className="text-[10px] md:text-xs font-light tracking-wide text-white/45 mt-1 select-text">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </footer>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

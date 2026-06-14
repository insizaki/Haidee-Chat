"use client";

// =============================================================================
// Main Page — Wallet Connect → Chat
// =============================================================================

import { WalletConnect } from "@/components/WalletConnect";
import { Chat } from "@/components/Chat";
import { useWallet } from "@/hooks/useWallet";
import { useState, useEffect } from "react";

export default function Home() {
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="flex h-full w-full flex-col bg-black items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white" />
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-[var(--background)]">
      {wallet.isConnected && wallet.address ? (
        <Chat
          walletAddress={wallet.address}
          permissionsContext={wallet.permissionsContext}
          delegationCert={wallet.delegationCert}
        />
      ) : (
        <WalletConnect wallet={wallet} />
      )}
    </main>
  );
}

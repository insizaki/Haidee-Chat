"use client";

// =============================================================================
// WagmiProvider — Wallet Infrastructure
// =============================================================================

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider as WagmiProviderLib, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { type ReactNode, useState } from "react";
import { injected, walletConnect } from "wagmi/connectors";

// -----------------------------------------------------------------------------
// Wagmi Configuration
// -----------------------------------------------------------------------------

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "your_walletconnect_project_id_here";

const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    ...(projectId !== "your_walletconnect_project_id_here"
      ? [walletConnect({ projectId })]
      : []),
  ],
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ||
        "https://sepolia.base.org"
    ),
  },
});

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProviderLib config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#6366f1",
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProviderLib>
  );
}

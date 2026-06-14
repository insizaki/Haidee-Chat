"use client";

// =============================================================================
// useWallet — Wallet State Hook
// =============================================================================

import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useState, useCallback, useEffect } from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WalletState {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | undefined;
  permissionsContext: string | null;
  delegationCert: string | null;
  isFallbackMode: boolean;
  disconnect: () => void;
  setupSession: () => Promise<void>;
  isSettingUp: boolean;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useWallet(): WalletState {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  const [permissionsContext, setPermissionsContext] = useState<string | null>(
    null
  );
  const [delegationCert, setDelegationCert] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);

  const setupSession = useCallback(async () => {
    if (!walletClient || hasSetup) return;

    setIsSettingUp(true);

    try {
      // Try EIP-7715 permissions
      const { requestWalletPermissions } = await import("@/lib/permissions");
      const permsResult = await requestWalletPermissions(walletClient);

      if (permsResult.context) {
        setPermissionsContext(permsResult.context);
      }

      // Try EIP-7710 delegation
      const { createDelegation } = await import("@/lib/delegation");
      const delegResult = await createDelegation(walletClient);

      if (delegResult.delegation) {
        setDelegationCert(delegResult.delegation);
      }

      // If both failed, we're in fallback mode
      if (permsResult.fallback && delegResult.fallback) {
        setIsFallbackMode(true);
      }

      setHasSetup(true);
    } catch (error) {
      console.warn("Session setup failed, using fallback mode:", error);
      setIsFallbackMode(true);
      setHasSetup(true);
    } finally {
      setIsSettingUp(false);
    }
  }, [walletClient, hasSetup]);

  // Auto-setup when wallet connects
  useEffect(() => {
    if (isConnected && walletClient && !hasSetup) {
      setupSession();
    }
  }, [isConnected, walletClient, hasSetup, setupSession]);

  return {
    address: address as string | undefined,
    isConnected,
    isConnecting,
    chainId,
    permissionsContext,
    delegationCert,
    isFallbackMode,
    disconnect,
    setupSession,
    isSettingUp,
  };
}

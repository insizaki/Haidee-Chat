"use client";

// =============================================================================
// useConversation — Chat State Management Hook
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, ConversationState, ChatApiResponse } from "@/types";
import { useSendTransaction, useWriteContract, usePublicClient } from "wagmi";
import { parseEther, parseUnits, encodeFunctionData } from "viem";
import { bytesToHex } from "viem/utils";
import { USDC_ADDRESS, ERC20_ABI } from "@/constants/tokens";
import { formatSuccessMessage, formatErrorMessage } from "@/lib/format";

async function relayerRpc<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch("https://relayer.1shotapi.dev/relayers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  if ("error" in json) {
    throw new Error(json.error.message);
  }
  return json.result;
}

function toRelayerJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return `0x${value.toString(16)}`;
  if (value instanceof Uint8Array) return bytesToHex(value);
  if (Array.isArray(value)) return value.map(toRelayerJson);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toRelayerJson(v);
    return out;
  }
  return value;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useConversation(
  walletAddress: string | undefined,
  permissionsContext: string | null = null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationState, setConversationState] =
    useState<ConversationState>({ status: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Quote expiry timer
  useEffect(() => {
    if (conversationState.status === "awaiting_confirmation") {
      const remaining = conversationState.expiresAt - Date.now();

      if (remaining <= 0) {
        // Already expired
        setConversationState({ status: "idle" });
        addAssistantMessage(
          "⏰ Quote expired. Say your request again to get a fresh quote."
        );
        return;
      }

      timerRef.current = setTimeout(() => {
        setConversationState({ status: "idle" });
        addAssistantMessage(
          "⏰ Quote expired. Say your request again to get a fresh quote."
        );
      }, remaining);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [conversationState]);

  // Add a user message to the chat
  const addUserMessage = useCallback((content: string) => {
    const msg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Add an assistant message to the chat
  const addAssistantMessage = useCallback(
    (content: string, confirmationData?: ChatMessage["confirmationData"]) => {
      const msg: ChatMessage = {
        id: `asst-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
        confirmationData,
      };
      setMessages((prev) => [...prev, msg]);
    },
    []
  );

  // Send a message to the chat API
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !walletAddress) return;

      // Clear any existing expiry timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Add user message
      addUserMessage(text);
      setIsLoading(true);

      // Intercept confirmation/cancellation for transfer actions client-side
      if (
        conversationState.status === "awaiting_confirmation" &&
        conversationState.pendingAction.action === "transfer"
      ) {
        const lowerText = text.trim().toLowerCase();
        const action = conversationState.pendingAction;

        if (lowerText === "confirm" || lowerText === "yes" || lowerText === "y") {
          try {
            let txHash: `0x${string}` = "0x";

            if (permissionsContext) {
              // 1. Fetch relayer capabilities to discover target collectors
              const caps = await relayerRpc<any>("relayer_getCapabilities", ["84532"]);
              const chainCaps = caps["84532"];
              if (!chainCaps) throw new Error("Base Sepolia not supported by relayer");

              const feeCollector = chainCaps.feeCollector;
              const usdcToken = chainCaps.tokens.find((t: any) => t.symbol === "USDC") || chainCaps.tokens[0];

              // 2. Fetch fee quote data
              const feeData = await relayerRpc<any>("relayer_getFeeData", {
                chainId: "84532",
                token: usdcToken.address,
              });

              // 3. Compute fee amount in USDC atoms (assume ~200,000 gas limit)
              const estimatedGasUsed = BigInt(200000);
              const nativeFeeWei = BigInt(feeData.gasPrice) * estimatedGasUsed;
              const tokenAtomsFloat = Number(nativeFeeWei) * feeData.rate;
              let feeAmount = BigInt(Math.ceil(tokenAtomsFloat));
              const minFee = BigInt(feeData.minFee);
              if (feeAmount < minFee) feeAmount = minFee;

              // 4. Decode delegation context
              const { decodeDelegations } = await import("@metamask/smart-accounts-kit/utils");
              const delegations = decodeDelegations(permissionsContext as any).map((d: any) => toRelayerJson(d));

              // 5. Build fee payment calldata (transfer fee to feeCollector)
              const feeTransferExecution = {
                target: usdcToken.address,
                value: "0x0",
                data: encodeFunctionData({
                  abi: [
                    {
                      name: "transfer",
                      type: "function",
                      stateMutability: "nonpayable",
                      inputs: [
                        { name: "recipient", type: "address" },
                        { name: "amount", type: "uint256" },
                      ],
                      outputs: [{ name: "", type: "bool" }],
                    },
                  ],
                  functionName: "transfer",
                  args: [feeCollector, feeAmount],
                }),
              };

              // 6. Build work execution (transfer to destination)
              let workExecution: any;
              if (action.token === "ETH") {
                workExecution = {
                  target: action.recipient as `0x${string}`,
                  value: `0x${parseEther(action.amount.toString()).toString(16)}`,
                  data: "0x",
                };
              } else {
                workExecution = {
                  target: USDC_ADDRESS,
                  value: "0x0",
                  data: encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "transfer",
                    args: [
                      action.recipient as `0x${string}`,
                      parseUnits(action.amount.toString(), 6),
                    ],
                  }),
                };
              }

              // 7. Submit to relayer
              const taskId = await relayerRpc<string>("relayer_send7710Transaction", {
                chainId: "84532",
                context: feeData.context,
                transactions: [
                  {
                    permissionContext: delegations,
                    executions: [feeTransferExecution, workExecution],
                  },
                ],
              });

              // 8. Poll for transaction status and get transaction hash
              let status = 100;
              const deadline = Date.now() + 5 * 60 * 1000; // 5 min timeout
              while (Date.now() < deadline) {
                const res = await relayerRpc<any>("relayer_getStatus", { id: taskId, logs: false });
                status = res.status;
                if (res.hash) {
                  txHash = res.hash;
                }

                if (status === 200) {
                  break;
                }
                if (status === 400 || status === 500) {
                  throw new Error(res.message || "Relayer transaction reverted or rejected.");
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));
              }

              if (status !== 200) {
                throw new Error("Timeout waiting for relayer transaction confirmation.");
              }
            } else {
              if (action.token === "ETH") {
                txHash = await sendTransactionAsync({
                  to: action.recipient as `0x${string}`,
                  value: parseEther(action.amount.toString()),
                });
              } else if (action.token === "USDC") {
                txHash = await writeContractAsync({
                  address: USDC_ADDRESS,
                  abi: ERC20_ABI,
                  functionName: "transfer",
                  args: [
                    action.recipient as `0x${string}`,
                    parseUnits(action.amount.toString(), 6),
                  ],
                });
              } else {
                throw new Error(`Unsupported token: ${action.token}`);
              }

              // Wait for receipt
              if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash: txHash });
              }
            }

            const recipientShort =
              action.recipient.length > 12
                ? `${action.recipient.slice(0, 6)}...${action.recipient.slice(-4)}`
                : action.recipient;

            const details = `Sent ${action.amount} ${action.token} to ${recipientShort}`;
            addAssistantMessage(
              formatSuccessMessage("Transfer", txHash, details)
            );
            setConversationState({ status: "idle" });
          } catch (error: any) {
            console.error("Failed to execute on-chain transfer:", error);
            const errMsg = error?.shortMessage || error?.message || "Failed to execute transaction.";
            addAssistantMessage(formatErrorMessage(errMsg));
            setConversationState({ status: "idle" });
          } finally {
            setIsLoading(false);
          }
          return;
        } else if (lowerText === "cancel" || lowerText === "no" || lowerText === "n") {
          addAssistantMessage("Cancelled. What else can I help you with?");
          setConversationState({ status: "idle" });
          setIsLoading(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages,
            state: conversationState,
            walletAddress,
          }),
        });

        const data: ChatApiResponse = await response.json();

        // Add assistant reply
        addAssistantMessage(data.reply, data.confirmationData);

        // Update conversation state
        setConversationState(data.newState);
      } catch (error) {
        console.error("Failed to send message:", error);
        addAssistantMessage(
          "❌ Something went wrong. Please try again."
        );
        setConversationState({ status: "idle" });
      } finally {
        setIsLoading(false);
      }
    },
    [
      walletAddress,
      conversationState,
      messages,
      addUserMessage,
      addAssistantMessage,
      sendTransactionAsync,
      writeContractAsync,
      publicClient,
      permissionsContext,
    ]
  );

  // Handle confirmation button clicks (same as typing "confirm"/"cancel")
  const handleConfirm = useCallback(() => {
    sendMessage("confirm");
  }, [sendMessage]);

  const handleCancel = useCallback(() => {
    sendMessage("cancel");
  }, [sendMessage]);

  return {
    messages,
    conversationState,
    isLoading,
    scrollRef,
    sendMessage,
    handleConfirm,
    handleCancel,
  };
}

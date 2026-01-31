"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import type { PrivateSwapStep } from "@/hooks/use-private-swap";
import type { SwapRecoveryErrorCode } from "@/lib/privacy/swap-session";
import { cn } from "@/lib/utils";

interface PrivacyDebugState {
  swapStep: PrivateSwapStep | null;
  swapErrorCode: SwapRecoveryErrorCode | null;
  swapErrorMessage: string;
  showRecovery: boolean;
  recoveryErrorCode: SwapRecoveryErrorCode | null;
  recoveryErrorMessage: string;
  recoveryStatus: string;
  recoveryAddress: string;
  isRecovering: boolean;
}

interface PrivacyDebugContextValue {
  enabled: boolean;
  state: PrivacyDebugState;
  setState: (state: PrivacyDebugState) => void;
  update: (updates: Partial<PrivacyDebugState>) => void;
  reset: () => void;
}

const DEFAULT_STATE: PrivacyDebugState = {
  swapStep: null,
  swapErrorCode: null,
  swapErrorMessage: "",
  showRecovery: false,
  recoveryErrorCode: null,
  recoveryErrorMessage: "",
  recoveryStatus: "",
  recoveryAddress: "",
  isRecovering: false,
};

const PrivacyDebugContext = createContext<PrivacyDebugContextValue>({
  enabled: false,
  state: DEFAULT_STATE,
  setState: () => {},
  update: () => {},
  reset: () => {},
});

const SWAP_STEPS: PrivateSwapStep[] = [
  "initializing",
  "withdrawing",
  "waiting_funds",
  "quoting",
  "swapping",
  "confirming_swap",
  "depositing",
  "confirming_deposit",
  "success",
  "error",
];

const DEFAULT_RECOVERY_ADDRESS = "9FhY4n3fJ4m9eP8wEZsL3nq4T4zZkYx8B1tVJmTz4mQe";

const RECOVERY_STATUSES = [
  "Checking the temporary wallet...",
  "Sending 0.01 SOL...",
  "Confirming transfer...",
  "All set. Funds are back in private balance.",
];

const ERROR_MESSAGES: Record<SwapRecoveryErrorCode, string> = {
  insufficient_sol:
    "We need a tiny amount of SOL to finish this swap. Add SOL and try again.",
  simulation_failed: "We couldn't prepare this swap. Please try again.",
  user_cancelled: "You cancelled the request.",
  unknown: "We couldn't finish the swap. Please try again.",
};

export function PrivacyDebugProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEBUG_PRIVACY === "1";

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [state, setState] = useState<PrivacyDebugState>(DEFAULT_STATE);

  const value = useMemo(
    () => ({
      enabled,
      state,
      setState,
      update: (updates: Partial<PrivacyDebugState>) =>
        setState((prev) => ({ ...prev, ...updates })),
      reset: () => setState(DEFAULT_STATE),
    }),
    [enabled, state],
  );

  return (
    <PrivacyDebugContext.Provider value={value}>
      {children}
      {enabled && mounted && <PrivacyDebugOverlay />}
    </PrivacyDebugContext.Provider>
  );
}

export function usePrivacyDebug() {
  return useContext(PrivacyDebugContext);
}

function PrivacyDebugOverlay() {
  const { state, update, reset } = usePrivacyDebug();
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      setPosition({
        x: Math.max(8, event.clientX - offsetRef.current.x),
        y: Math.max(8, event.clientY - offsetRef.current.y),
      });
    }

    function handleUp() {
      draggingRef.current = false;
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    draggingRef.current = true;
    const rect = overlayRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  return createPortal(
    <div
      ref={overlayRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-[80] w-80 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 shadow-lg backdrop-blur"
    >
      <div
        className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 cursor-move select-none"
        onPointerDown={handlePointerDown}
      >
        <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          Privacy Debug
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-500 mt-1">
          UI-only overrides. No chain calls.
        </p>
      </div>
      <div className="p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="text-neutral-500">Open hub</div>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("privacy:open"))
            }
            className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Open Privacy Hub
          </button>
        </div>

        <div>
          <div className="text-neutral-500 mb-1">Swap step</div>
          <div className="flex flex-wrap gap-1">
            {SWAP_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => update({ swapStep: step })}
                className={cn(
                  "px-2 py-1 rounded-md border text-[11px]",
                  state.swapStep === step
                    ? "bg-purple-500 border-purple-500 text-white"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                )}
              >
                {step.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-neutral-500 mb-1">Swap errors</div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(ERROR_MESSAGES) as SwapRecoveryErrorCode[]).map(
              (code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    update({
                      swapStep: "error",
                      swapErrorCode: code,
                      swapErrorMessage: ERROR_MESSAGES[code],
                    })
                  }
                  className={cn(
                    "px-2 py-1 rounded-md border text-[11px]",
                    state.swapErrorCode === code
                      ? "bg-red-500 border-red-500 text-white"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  )}
                >
                  {code.replace("_", " ")}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-neutral-500" htmlFor="debug-recovery-toggle">
            Show recovery banner
          </label>
          <input
            id="debug-recovery-toggle"
            type="checkbox"
            checked={state.showRecovery}
            onChange={(event) => update({ showRecovery: event.target.checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-neutral-500" htmlFor="debug-recovering-toggle">
            Recovering in progress
          </label>
          <input
            id="debug-recovering-toggle"
            type="checkbox"
            checked={state.isRecovering}
            onChange={(event) => update({ isRecovering: event.target.checked })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-neutral-500" htmlFor="debug-recovery-address">
            Recovery address
          </label>
          <input
            id="debug-recovery-address"
            type="text"
            value={state.recoveryAddress}
            placeholder={DEFAULT_RECOVERY_ADDRESS}
            onChange={(event) =>
              update({ recoveryAddress: event.target.value })
            }
            className="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-[11px] text-neutral-700 dark:text-neutral-200"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                update({
                  showRecovery: true,
                  recoveryErrorCode: "insufficient_sol",
                  recoveryErrorMessage: ERROR_MESSAGES.insufficient_sol,
                })
              }
              className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Recovery needs SOL
            </button>
            <button
              type="button"
              onClick={() =>
                update({
                  showRecovery: true,
                  recoveryErrorCode: "unknown",
                  recoveryErrorMessage: "We couldn't finish the recovery.",
                })
              }
              className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Recovery error
            </button>
          </div>
        </div>

        <div>
          <div className="text-neutral-500 mb-1">Recovery status</div>
          <div className="flex flex-wrap gap-1">
            {RECOVERY_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  update({
                    showRecovery: true,
                    recoveryStatus: status,
                  })
                }
                className={cn(
                  "px-2 py-1 rounded-md border text-[11px]",
                  state.recoveryStatus === status
                    ? "bg-purple-500 border-purple-500 text-white"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                )}
              >
                {status.split(" ")[0]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => update({ recoveryStatus: "" })}
              className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={reset}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Reset overrides
          </button>
          <span className="text-[10px] text-neutral-400">Debug only</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

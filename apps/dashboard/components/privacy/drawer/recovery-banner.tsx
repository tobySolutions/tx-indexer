"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { SwapRecoveryPayload } from "@/lib/privacy/swap-session";
import { cn } from "@/lib/utils";
import { AnimatedNotice } from "./animated-notice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RECOVERY_STEPS = ["Check", "Send", "Confirm", "Done"] as const;
const SESSION_TTL_HOURS = 48;

function getRecoveryStepIndex(status: string | null): number {
  if (!status) return 0;
  const normalized = status.toLowerCase();
  if (normalized.startsWith("checking")) return 0;
  if (normalized.startsWith("sending")) return 1;
  if (normalized.startsWith("confirming")) return 2;
  if (normalized.startsWith("all set")) return 3;
  return 0;
}

function isRecoveryInProgress(status: string | null): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.startsWith("checking") ||
    normalized.startsWith("sending") ||
    normalized.startsWith("confirming")
  );
}

function isRecoveryDone(status: string | null): boolean {
  if (!status) return false;
  return status.toLowerCase().startsWith("all set");
}

function getTimeRemaining(createdAt: number): string {
  const expiresAt = createdAt + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) {
    return "expired";
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

function isExpiringSoon(createdAt: number): boolean {
  const expiresAt = createdAt + SESSION_TTL_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  const remainingMs = expiresAt - now;
  // Warning if less than 6 hours remaining
  return remainingMs < 6 * 60 * 60 * 1000;
}

function RecoveryTimeline({ status }: { status: string | null }) {
  const activeIndex = getRecoveryStepIndex(status);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {RECOVERY_STEPS.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <motion.div
              initial={false}
              animate={{
                backgroundColor:
                  index <= activeIndex ? "#a855f7" : "transparent",
                borderColor: index <= activeIndex ? "#a855f7" : undefined,
                scale: prefersReducedMotion
                  ? 1
                  : index === activeIndex
                    ? [1, 1.2, 1]
                    : 1,
              }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.3,
                      scale: { duration: 0.4, ease: "easeOut" },
                    }
              }
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                index > activeIndex &&
                  "border-neutral-300 dark:border-neutral-700",
              )}
            />
            {index < RECOVERY_STEPS.length - 1 && (
              <div className="relative h-px flex-1 mx-2 bg-neutral-200 dark:bg-neutral-700">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: index < activeIndex ? 1 : 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.4, ease: "easeOut" }
                  }
                  className="absolute inset-0 bg-purple-500 origin-left"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RecoveryBannerProps {
  isLoading: boolean;
  isSwapping: boolean;
  isRecovering: boolean;
  needsTopUp: boolean;
  recoverySession: SwapRecoveryPayload | null;
  recoveryError: string | null;
  recoveryStatus: string | null;
  onRecover: () => void;
  onDismiss: () => void;
  onTopUp: () => void;
}

export function RecoveryBanner({
  isLoading,
  isSwapping,
  isRecovering,
  needsTopUp,
  recoverySession,
  recoveryError,
  recoveryStatus,
  onRecover,
  onDismiss,
  onTopUp,
}: RecoveryBannerProps) {
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  const hasSession = Boolean(recoverySession);
  const showBanner = hasSession && !isSwapping && !isLoading;

  const recoveryMessage = recoveryError || recoveryStatus;
  const recoveryMessageClass = recoveryError
    ? "text-red-500"
    : "text-purple-600 dark:text-purple-300";
  const isDone = hasSession && isRecoveryDone(recoveryStatus);
  const isBusy = isRecovering || isRecoveryInProgress(recoveryStatus);

  const timeRemaining = recoverySession
    ? getTimeRemaining(recoverySession.createdAt)
    : null;
  const expiringSoon = recoverySession
    ? isExpiringSoon(recoverySession.createdAt)
    : false;

  const handleDismissClick = () => {
    // If recovery is done, just dismiss without confirmation
    if (isDone) {
      onDismiss();
      return;
    }
    // Otherwise, show confirmation dialog
    setShowDismissConfirm(true);
  };

  const handleConfirmDismiss = () => {
    onDismiss();
    setShowDismissConfirm(false);
  };

  return (
    <>
      <AnimatedNotice show={showBanner}>
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
          {timeRemaining && !isDone && (
            <span
              className={cn(
                "inline-block text-xs px-2 py-0.5 rounded-full mb-2",
                expiringSoon
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
              )}
            >
              {timeRemaining}
            </span>
          )}
          <p className="text-sm text-purple-700 dark:text-purple-300">
            {needsTopUp
              ? "We couldn't finish the swap because the temporary wallet is missing a tiny amount of SOL to cover processing costs."
              : "We found an unfinished private swap. You can recover the funds back to your private balance."}
          </p>
          {recoveryStatus && hasSession && (
            <div className="mt-3 space-y-2">
              <RecoveryTimeline status={recoveryStatus} />
            </div>
          )}
          {recoveryMessage && hasSession && (
            <p className={cn("text-xs mt-2", recoveryMessageClass)}>
              {recoveryMessage}
            </p>
          )}
          {hasSession && (
            <div className="flex gap-2 mt-3">
              {isDone ? (
                <button
                  type="button"
                  onClick={handleDismissClick}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  Close
                </button>
              ) : (
                <>
                  {needsTopUp && (
                    <button
                      type="button"
                      onClick={onTopUp}
                      disabled={isBusy}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        isBusy
                          ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                          : "bg-purple-500 text-white hover:bg-purple-500/90",
                      )}
                    >
                      Add SOL to finish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onRecover}
                    disabled={isBusy}
                    aria-busy={isBusy}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isBusy
                        ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                        : needsTopUp
                          ? "border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                          : "bg-purple-500 text-white hover:bg-purple-500/90",
                    )}
                  >
                    {isBusy && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
                        Recovering...
                      </span>
                    )}
                    {!isBusy && "Recover funds"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissClick}
                    disabled={isBusy}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isBusy
                        ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                        : "border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30",
                    )}
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </AnimatedNotice>

      <AlertDialog
        open={showDismissConfirm}
        onOpenChange={setShowDismissConfirm}
      >
        <AlertDialogContent open={showDismissConfirm}>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss recovery?</AlertDialogTitle>
            <AlertDialogDescription>
              There may still be funds in the temporary wallet. If you dismiss
              this, you won&apos;t be able to recover them. Are you sure you
              want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDismiss}
              className="bg-vibrant-red text-white hover:bg-vibrant-red/90"
            >
              Yes, dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Tag, Check, Loader2, AlertCircle } from "lucide-react";
import {
  upsertWalletLabel,
  generateDefaultLabel,
} from "@/app/actions/wallet-labels";
import { useWalletLabels } from "@/hooks/use-wallet-labels";
import { isValidSolanaAddress } from "@/lib/validations";

interface LabelWalletDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LabelWalletDrawer({
  open,
  onOpenChange,
}: LabelWalletDrawerProps) {
  // Use centralized wallet labels hook - shares cache with other components
  const { getLabel, invalidate: invalidateLabels } = useWalletLabels();

  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingLabel, setExistingLabel] = useState<string | null>(null);

  // Check if address already has a label
  useEffect(() => {
    if (!isValidSolanaAddress(address)) {
      setExistingLabel(null);
      return;
    }
    const existing = getLabel(address);
    setExistingLabel(existing);
    if (existing && !label) {
      setLabel(existing);
    }
  }, [address, getLabel, label]);

  // Generate default label when address is valid and no label exists
  useEffect(() => {
    if (isValidSolanaAddress(address) && !existingLabel && !label) {
      generateDefaultLabel().then(setLabel);
    }
  }, [address, existingLabel, label]);

  const resetForm = useCallback(() => {
    setAddress("");
    setLabel("");
    setError(null);
    setSuccess(false);
    setExistingLabel(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!isValidSolanaAddress(address)) {
        setError("Please enter a valid Solana address");
        return;
      }

      if (!label.trim()) {
        setError("Please enter a label");
        return;
      }

      setIsSaving(true);
      const result = await upsertWalletLabel(address, label.trim());
      setIsSaving(false);

      if (result.success) {
        setSuccess(true);
        // Invalidate labels cache so other components get the update
        await invalidateLabels();
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(result.error ?? "Failed to save label");
      }
    },
    [address, label, handleClose, invalidateLabels],
  );

  const isAddressValid = isValidSolanaAddress(address);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Tag className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            label wallet
          </SheetTitle>
          <SheetDescription>
            Save a label for any wallet address
          </SheetDescription>
        </SheetHeader>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Label saved
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {label} has been saved for this address
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 mt-6">
            <div className="space-y-4 flex-1">
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">
                  wallet address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setError(null);
                    setLabel("");
                  }}
                  placeholder="Enter Solana address"
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-neutral-800 text-sm font-mono text-neutral-900 dark:text-neutral-100 transition-colors",
                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-vibrant-red focus-visible:border-vibrant-red",
                    error && !isAddressValid
                      ? "border-red-300 dark:border-red-500"
                      : "border-neutral-200 dark:border-neutral-700",
                  )}
                />
                {existingLabel && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    This address is already labeled as &quot;{existingLabel}
                    &quot;
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">
                  label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g., alice, rent, savings"
                  disabled={!isAddressValid}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 transition-colors",
                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-vibrant-red focus-visible:border-vibrant-red",
                    "disabled:bg-neutral-50 disabled:dark:bg-neutral-900 disabled:text-neutral-400 disabled:dark:text-neutral-500",
                    error && isAddressValid
                      ? "border-red-300 dark:border-red-500"
                      : "border-neutral-200 dark:border-neutral-700",
                  )}
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 pb-4 sm:pb-0 border-t border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={!isAddressValid || !label.trim() || isSaving}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  isAddressValid && label.trim() && !isSaving
                    ? "bg-vibrant-red text-white hover:bg-vibrant-red/90 cursor-pointer"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed",
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {existingLabel ? "update" : "save"}
              </button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

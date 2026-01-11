"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DeleteTradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: {
    id: string
    symbol: string
    pnl: number
  } | null
  onConfirm: (tradeId: string) => Promise<void>
}

export function DeleteTradeDialog({
  open,
  onOpenChange,
  trade,
  onConfirm,
}: DeleteTradeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    // #region agent log
    console.log('[DEBUG-A] handleDelete called', { trade, hasTrade: !!trade });
    // #endregion
    if (!trade) return
    
    setIsDeleting(true)
    setError(null)
    try {
      // #region agent log
      console.log('[DEBUG-B] Calling onConfirm with tradeId', { tradeId: trade.id });
      // #endregion
      await onConfirm(trade.id)
      // #region agent log
      console.log('[DEBUG-B] onConfirm completed successfully', { tradeId: trade.id });
      // #endregion
      onOpenChange(false)
    } catch (err) {
      // #region agent log
      console.log('[DEBUG-C] onConfirm threw error', { error: err instanceof Error ? err.message : String(err) });
      // #endregion
      console.error("Failed to delete trade:", err)
      setError(err instanceof Error ? err.message : "Failed to delete trade")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete trade?
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            This will permanently remove the trade and update your stats.
            {trade && (
              <span className="block mt-2 text-zinc-300">
                <strong>{trade.symbol}</strong> trade with P&L of{" "}
                <span className={trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </span>
              </span>
            )}
            {error && (
              <span className="block mt-3 p-2 rounded bg-red-500/20 text-red-400 text-sm">
                Error: {error}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Trash2, AlertCircle } from "lucide-react"
import type { Equipment, DeleteReason } from "@/lib/types"

interface MultipleDeleteProps {
  selectedItems: string[]
  onDelete: (ids: string[], deleteReason: string, deleteNote?: string) => void
  disabled?: boolean
  equipment?: Equipment[]
}

export default function MultipleDelete({
  selectedItems,
  equipment = [],
  onDelete,
  disabled = false
}: MultipleDeleteProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState<DeleteReason | "">("")
  const [deleteNote, setDeleteNote] = useState("")

  // Filter selected items to only include warehouse items
  const selectedWarehouseItems = selectedItems.filter((id) => {
    const item = equipment.find((eq) => eq.id === id)
    if (!item) return false
    return item.buildingType === "warehouse"
  })

  const handleDeleteConfirm = () => {
    if (deleteReason) {
      const note = deleteReason === "other" ? deleteNote : undefined
      onDelete(selectedWarehouseItems, deleteReason, note)
      setIsDialogOpen(false)
      setDeleteReason("")
      setDeleteNote("")
    }
  }

  return (
    <>
      <div className="relative group">
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
          disabled={selectedWarehouseItems.length === 0 || disabled}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete ({selectedWarehouseItems.length})
        </Button>
        {selectedItems.length > 0 && selectedWarehouseItems.length < selectedItems.length && (
          <div className="absolute left-0 -bottom-10 z-50 w-60 p-2 bg-amber-50 text-amber-800 text-xs rounded shadow-md border border-amber-200">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Only warehouse items can be deleted</span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Multiple Items</DialogTitle>
            <DialogDescription>
              Please specify the reason for deleting {selectedWarehouseItems.length} equipment items.
              {selectedItems.length !== selectedWarehouseItems.length && (
                <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded-md text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Note: Only {selectedWarehouseItems.length} of {selectedItems.length} selected items are in the
                      warehouse and eligible for deletion.
                    </span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <RadioGroup value={deleteReason} onValueChange={(value) => setDeleteReason(value as DeleteReason)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broken" id="multiple-broken" />
                <Label htmlFor="multiple-broken">Broken</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="obsolete" id="multiple-obsolete" />
                <Label htmlFor="multiple-obsolete">Obsolete</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="multiple-other" />
                <Label htmlFor="multiple-other">Other</Label>
              </div>
            </RadioGroup>

            {deleteReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="multiple-deleteNote">Please explain:</Label>
                <Textarea
                  id="multiple-deleteNote"
                  placeholder="Enter reason for deletion"
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {deleteReason && deleteReason === "other" && !deleteNote && (
              <div className="flex items-center text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Please provide an explanation</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={
                !deleteReason || (deleteReason === "other" && !deleteNote) || selectedWarehouseItems.length === 0
              }
            >
              Delete Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

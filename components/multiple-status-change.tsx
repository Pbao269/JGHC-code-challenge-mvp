"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import type { Equipment, EquipmentStatus } from "@/lib/types"
import { getRoomById } from "@/lib/rooms"

interface MultipleStatusChangeProps {
  selectedItems: string[]
  onStatusChange: (ids: string[], newStatus: EquipmentStatus) => void
  disabled?: boolean
  equipment?: Equipment[]
  onCancel?: () => void
}

export default function MultipleStatusChange({
  selectedItems,
  equipment = [],
  onStatusChange,
  onCancel,
  disabled = false
}: MultipleStatusChangeProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<EquipmentStatus | "">("")
  const [availableStatuses, setAvailableStatuses] = useState<EquipmentStatus[]>([])
  const [currentStatus, setCurrentStatus] = useState<EquipmentStatus | null>(null)

  // Get selected equipment details
  const selectedEquipment = equipment.filter((item) => selectedItems.includes(item.id))

  // Check if all selected items have the same status and location type
  useEffect(() => {
    if (selectedItems.length > 0) {
      const selectedEquipmentItems = equipment.filter((item) => selectedItems.includes(item.id))
      if (selectedEquipmentItems.length > 0) {
        const firstItem = selectedEquipmentItems[0]
        const allSameStatus = selectedEquipmentItems.every((item) => item.status === firstItem.status)

        if (allSameStatus) {
          setCurrentStatus(firstItem.status)

          // Determine available statuses based on location
          const room = getRoomById(firstItem.roomId)
          if (room?.buildingType === "warehouse") {
            setAvailableStatuses(["stored", "maintenance", "replaced"])
          } else {
            setAvailableStatuses(["in-use", "need-replacement"])
          }
        } else {
          setCurrentStatus(null)
          setAvailableStatuses([])
        }
      }
    }
  }, [selectedItems, equipment])

  const handleStatusChange = () => {
    if (newStatus) {
      onStatusChange(selectedItems, newStatus as EquipmentStatus)
      setIsDialogOpen(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="bg-usf-darkGreen hover:bg-usf-green text-white"
        disabled={!currentStatus || disabled}
      >
        Change Status ({selectedItems.length})
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status for Multiple Items</DialogTitle>
            <DialogDescription>Update the status for {selectedItems.length} selected items</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {currentStatus ? (
              <>
                <div className="p-3 border rounded-md bg-muted/30">
                  <p className="text-sm font-medium">
                    Current Status:{" "}
                    <span className="font-bold">
                      {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1).replace("-", " ")}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Select New Status</h3>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as EquipmentStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses
                        .filter((status) => status !== currentStatus)
                        .map((status) => {
                          let label = ""
                          let color = ""

                          switch (status) {
                            case "stored":
                              label = "Stored"
                              color = "text-gray-600"
                              break
                            case "maintenance":
                              label = "Maintenance"
                              color = "text-yellow-600"
                              break
                            case "replaced":
                              label = "Replaced"
                              color = "text-red-600"
                              break
                            case "in-use":
                              label = "In Use"
                              color = "text-green-600"
                              break
                            case "need-replacement":
                              label = "Need Replacement"
                              color = "text-red-600"
                              break
                          }

                          return (
                            <SelectItem key={status} value={status} className={color}>
                              {label}
                            </SelectItem>
                          )
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Cannot change status</p>
                    <p className="text-sm">
                      Selected items have different statuses. Please select items with the same status.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={!newStatus} className="bg-usf-green hover:bg-usf-darkGreen">
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

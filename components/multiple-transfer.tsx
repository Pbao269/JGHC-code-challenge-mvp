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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Boxes, School, Building2, Search, AlertCircle } from "lucide-react"
import type { Equipment, BuildingType } from "@/lib/types"
import { allRooms, searchRoomsByPrefix } from "@/lib/rooms"

interface MultipleTransferProps {
  selectedItems: string[]
  onTransfer: (ids: string[], roomId: string) => void
  disabled?: boolean
  equipment?: Equipment[]
}

export default function MultipleTransfer({ 
  selectedItems, 
  onTransfer, 
  disabled = false,
  equipment = []
}: MultipleTransferProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | "">("")
  const [roomSearchQuery, setRoomSearchQuery] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")

  const handleBuildingTypeSelect = (type: BuildingType) => {
    setSelectedBuildingType(type)
    setRoomSearchQuery("")
    setSelectedRoomId("")

    // If warehouse is selected, automatically select the warehouse room
    if (type === "warehouse") {
      const warehouseRoom = allRooms.find((room) => room.buildingType === "warehouse")
      if (warehouseRoom) {
        setSelectedRoomId(warehouseRoom.id)
      }
    }
  }

  const handleTransferConfirm = () => {
    if (selectedRoomId) {
      onTransfer(selectedItems, selectedRoomId)
      setIsDialogOpen(false)
    }
  }

  const getBuildingTypeDetails = (buildingType: BuildingType) => {
    switch (buildingType) {
      case "warehouse":
        return {
          icon: <Boxes className="mr-1.5 h-3.5 w-3.5" />,
          class: "bg-usf-green/10 text-usf-green border border-usf-green/20",
        }
      case "classroom":
        return {
          icon: <School className="mr-1.5 h-3.5 w-3.5" />,
          class: "bg-usf-gold/20 text-usf-darkGold border border-usf-gold/30",
        }
      case "office":
        return {
          icon: <Building2 className="mr-1.5 h-3.5 w-3.5" />,
          class: "bg-usf-lightGreen/10 text-usf-lightGreen border border-usf-lightGreen/20",
        }
      default:
        return {
          icon: null,
          class: "bg-gray-100 text-gray-800",
        }
    }
  }

  // Filter rooms based on search query and selected building type
  const filteredRooms =
    selectedBuildingType === "warehouse"
      ? allRooms.filter((room) => room.buildingType === "warehouse")
      : roomSearchQuery
        ? searchRoomsByPrefix(roomSearchQuery, selectedBuildingType as BuildingType)
        : selectedBuildingType
          ? allRooms.filter((room) => room.buildingType === selectedBuildingType)
          : []

  // Get selected equipment details
  const selectedEquipmentItems = equipment.filter((item) => selectedItems.includes(item.id))

  // Check if all selected items are from the same location type
  const allSameLocationType = selectedEquipmentItems.length > 0 && selectedEquipmentItems.every((item) => {
    return item.buildingType === selectedEquipmentItems[0].buildingType
  })

  // Get the location type of the selected items
  const currentLocationType =
    allSameLocationType && selectedEquipmentItems.length > 0 
      ? selectedEquipmentItems[0].buildingType 
      : null

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)} 
        className="bg-usf-darkGreen hover:bg-usf-green text-white w-full sm:w-auto"
        disabled={disabled}
      >
        <span className="hidden sm:inline">Transfer {selectedItems.length} Items</span>
        <span className="sm:hidden">Transfer ({selectedItems.length})</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Multiple Items</DialogTitle>
            <DialogDescription>Transfer {selectedItems.length} selected items to a new location</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Step 1: Select building type */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">1. Select Building Type</h3>
              <Select
                value={selectedBuildingType}
                onValueChange={(value) => handleBuildingTypeSelect(value as BuildingType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select building type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse" className="flex items-center">
                    <div className="flex items-center">
                      <Boxes className="mr-2 h-4 w-4 text-usf-green" />
                      <span>Warehouse</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="classroom" className="flex items-center">
                    <div className="flex items-center">
                      <School className="mr-2 h-4 w-4 text-usf-gold" />
                      <span>Classroom</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="office" className="flex items-center">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4 text-usf-lightGreen" />
                      <span>Office</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Search for room (only for classroom and office) */}
            {selectedBuildingType && selectedBuildingType !== "warehouse" && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">2. Search for Room</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type to search rooms (e.g. HON 1)"
                    className="pl-8"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                  />
                </div>

                {/* Room search results */}
                <div className="mt-2 border rounded-md max-h-[200px] overflow-y-auto">
                  {filteredRooms.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {roomSearchQuery ? "No rooms found matching your search" : "Type to search for rooms"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRooms.map((room) => {
                        const buildingTypeDetails = getBuildingTypeDetails(room.buildingType);
                        return (
                          <div
                            key={room.id}
                            className={`p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between ${
                              selectedRoomId === room.id ? "bg-usf-green/10" : ""
                            }`}
                            onClick={() => setSelectedRoomId(room.id)}
                          >
                            <div className="flex items-center">
                              {buildingTypeDetails.icon}
                              <span className="ml-2">{room.name}</span>
                            </div>
                            {selectedRoomId === room.id && <div className="h-2 w-2 rounded-full bg-usf-green"></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* For warehouse, just show the single warehouse option */}
            {selectedBuildingType === "warehouse" && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">2. Selected Location</h3>
                <div className="p-3 border rounded-md bg-usf-green/5">
                  <div className="flex items-center">
                    <Boxes className="mr-2 h-4 w-4 text-usf-green" />
                    <span>HON Warehouse</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status change notice */}
            {selectedBuildingType && currentLocationType && selectedBuildingType !== currentLocationType && (
              <div className="p-3 border rounded-md bg-amber-50 text-amber-800 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Status will change when transferred:</p>
                    {/* From warehouse to classroom/office */}
                    {currentLocationType === "warehouse" && selectedBuildingType !== "warehouse" && (
                      <p>Items will change to &ldquo;In Use&rdquo; status</p>
                    )}

                    {/* From classroom/office to warehouse */}
                    {currentLocationType !== "warehouse" && selectedBuildingType === "warehouse" && (
                      <p>
                        &ldquo;In Use&rdquo; items will change to &ldquo;Stored&rdquo;
                        <br />
                        &ldquo;Need Replacement&rdquo; items will change to &ldquo;Replaced&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransferConfirm}
              disabled={!selectedRoomId}
              className="bg-usf-green hover:bg-usf-darkGreen"
            >
              Transfer Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, MoreVertical, MoveRight, Boxes, School, Building2, Search, AlertCircle } from "lucide-react"
import type { Equipment, BuildingType, DeleteReason } from "@/lib/types"
import { getEquipmentTypeIcon, getStatusDetails, getTimeAgo } from "@/lib/utils"
import { allRooms, getRoomById, searchRoomsByPrefix } from "@/lib/rooms"

interface EquipmentTableProps {
  equipment: Equipment[]
  onEdit: (equipment: Equipment) => void
  onDelete: (id: string, deleteReason: string, deleteNote?: string) => void
  onTransfer: (id: string, roomId: string) => void
  isMultipleSelect?: boolean
  selectedItems?: string[]
  setSelectedItems?: (items: string[]) => void
  multipleAction?: "transfer" | "status" | "delete" | null
}

export default function EquipmentTable({
  equipment,
  onEdit,
  onDelete,
  onTransfer,
  isMultipleSelect = false,
  selectedItems = [],
  setSelectedItems = () => {},
  multipleAction = null,
}: EquipmentTableProps) {
  const [deleteItem, setDeleteItem] = useState<Equipment | null>(null)
  const [deleteReason, setDeleteReason] = useState<DeleteReason | "">("")
  const [deleteNote, setDeleteNote] = useState("")

  const [transferItem, setTransferItem] = useState<Equipment | null>(null)
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | "">("")
  const [roomSearchQuery, setRoomSearchQuery] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")

  const handleDeleteConfirm = () => {
    if (deleteItem && deleteReason) {
      const note = deleteReason === "other" ? deleteNote : undefined
      onDelete(deleteItem.id, deleteReason, note)
      resetDeleteDialog()
    }
  }

  const resetDeleteDialog = () => {
    setDeleteItem(null)
    setDeleteReason("")
    setDeleteNote("")
  }

  const handleTransferConfirm = () => {
    if (transferItem && selectedRoomId) {
      onTransfer(transferItem.id, selectedRoomId)
      resetTransferDialog()
    }
  }

  const resetTransferDialog = () => {
    setTransferItem(null)
    setSelectedBuildingType("")
    setRoomSearchQuery("")
    setSelectedRoomId("")
  }

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

  // Check if equipment can be deleted (only in warehouse)
  const canDelete = (item: Equipment): boolean => {
    const room = getRoomById(item.roomId)
    return room?.buildingType === "warehouse"
  }

  // Check if equipment can be transferred out of warehouse (only "Stored" or "Maintenance" status)
  const canTransferFromWarehouse = (item: Equipment): boolean => {
    const room = getRoomById(item.roomId)
    if (room?.buildingType !== "warehouse") return true
    return item.status === "stored" || item.status === "maintenance"
  }

  // Check if item can be selected for multiple actions
  const canSelectForMultipleAction = (item: Equipment): boolean => {
    if (multipleAction === "transfer") {
      // For transfer, exclude "Replaced" items and ensure they can be transferred
      const room = getRoomById(item.roomId)
      if (room?.buildingType === "warehouse") {
        return item.status !== "replaced" && canTransferFromWarehouse(item)
      }
      return true
    } else if (multipleAction === "delete") {
      // For delete, only allow warehouse items
      return canDelete(item)
    }
    return true
  }

  // Toggle item selection
  const toggleItemSelection = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id))
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }

  return (
    <>
      <div className="rounded-md">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {isMultipleSelect && (
                <TableHead className="w-[50px]">
                  <span className="sr-only">Select</span>
                </TableHead>
              )}
              <TableHead className="font-semibold">Equipment</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Serial Number</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Imported</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Last Updated</TableHead>
              {!isMultipleSelect && <TableHead className="text-right font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isMultipleSelect ? 8 : 7} className="text-center py-10 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Boxes className="h-8 w-8 text-usf-gold/60" />
                    <p>No equipment found. Add some equipment to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              equipment.map((item) => {
                const room = getRoomById(item.roomId)
                const buildingTypeDetails = room ? getBuildingTypeDetails(room.buildingType) : { icon: null, class: "" }
                const statusDetails = getStatusDetails(item.status)
                const canSelect = canSelectForMultipleAction(item)

                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    {isMultipleSelect && (
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => canSelect && toggleItemSelection(item.id)}
                          disabled={!canSelect}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">
                          {getEquipmentTypeIcon(item.equipmentType)}
                        </span>
                        <span>{item.model}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{item.equipmentType}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${statusDetails.color}`}
                      >
                        {statusDetails.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${buildingTypeDetails.class}`}
                        >
                          {buildingTypeDetails.icon}
                          {room?.buildingType.charAt(0).toUpperCase() + room?.buildingType.slice(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">{room?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{item.serialNumber}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {item.dateImported}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{getTimeAgo(item.lastUpdated)} ago</span>
                        <span className="text-xs opacity-60">{new Date(item.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    {!isMultipleSelect && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setTransferItem(item)}
                              disabled={!canTransferFromWarehouse(item)}
                            >
                              <MoveRight className="mr-2 h-4 w-4" />
                              Transfer
                              {!canTransferFromWarehouse(item) && (
                                <span className="ml-2 text-xs text-muted-foreground">(Not eligible)</span>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteItem(item)}
                              className="text-red-600"
                              disabled={!canDelete(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                              {!canDelete(item) && (
                                <span className="ml-2 text-xs text-muted-foreground">(Warehouse only)</span>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && resetDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>Please specify the reason for deleting this equipment.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <RadioGroup value={deleteReason} onValueChange={setDeleteReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broken" id="broken" />
                <Label htmlFor="broken">Broken</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="obsolete" id="obsolete" />
                <Label htmlFor="obsolete">Obsolete</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>

            {deleteReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="deleteNote">Please explain:</Label>
                <Textarea
                  id="deleteNote"
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
            <Button variant="outline" onClick={resetDeleteDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!deleteReason || (deleteReason === "other" && !deleteNote)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={!!transferItem} onOpenChange={(open) => !open && resetTransferDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Equipment</DialogTitle>
            <DialogDescription>
              Select a new location for {transferItem?.model} ({transferItem?.equipmentType})
            </DialogDescription>
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
                      {filteredRooms.map((room) => (
                        <div
                          key={room.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between ${
                            selectedRoomId === room.id ? "bg-usf-green/10" : ""
                          }`}
                          onClick={() => setSelectedRoomId(room.id)}
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            {getBuildingTypeDetails(room.buildingType).icon}
                            <span className="ml-2 truncate">{room.name}</span>
                          </div>
                          {selectedRoomId === room.id && <div className="h-2 w-2 rounded-full bg-usf-green"></div>}
                        </div>
                      ))}
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
            {transferItem && (
              <div className="p-3 border rounded-md bg-amber-50 text-amber-800 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Status will change when transferred:</p>
                    {/* From warehouse to classroom/office */}
                    {getRoomById(transferItem.roomId)?.buildingType === "warehouse" &&
                      selectedBuildingType &&
                      selectedBuildingType !== "warehouse" && <p>Current status will change to "In Use"</p>}

                    {/* From classroom/office to warehouse */}
                    {getRoomById(transferItem.roomId)?.buildingType !== "warehouse" &&
                      selectedBuildingType === "warehouse" && (
                        <>
                          {transferItem.status === "in-use" && <p>Current status "In Use" will change to "Stored"</p>}
                          {transferItem.status === "need-replacement" && (
                            <p>Current status "Need Replacement" will change to "Replaced"</p>
                          )}
                        </>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetTransferDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleTransferConfirm}
              disabled={!selectedRoomId}
              className="bg-usf-green hover:bg-usf-darkGreen"
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

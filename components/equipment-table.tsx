"use client"

import { useState } from "react"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  Edit, Trash2, MoreVertical, MoveRight,
  Boxes, School, Building2, Search, AlertCircle,
} from "lucide-react"

import type { Equipment, BuildingType, DeleteReason } from "@/lib/types"
import { getEquipmentTypeIcon, getStatusDetails, getTimeAgo } from "@/lib/utils"
import { allRooms, searchRoomsByPrefix } from "@/lib/rooms"

interface EquipmentTableProps {
  equipment:         Equipment[]
  onEdit:            (equipment: Equipment) => void
  onDelete:          (id: string, reason: string, note?: string) => void
  onTransfer:        (id: string, roomId: string) => void
  isMultipleSelect?: boolean
  selectedItems?:    string[]
  setSelectedItems?: (ids: string[]) => void
  multipleAction?:   "transfer" | "status" | "delete" | null
}

export default function EquipmentTable({
  equipment,
  onEdit,
  onDelete,
  onTransfer,
  isMultipleSelect = false,
  selectedItems   = [],
  setSelectedItems = () => {},
  multipleAction  = null,
}: EquipmentTableProps) {
  // local dialog state
  const [deleteItem,   setDeleteItem]   = useState<Equipment | null>(null)
  const [deleteReason, setDeleteReason] = useState<DeleteReason | "">("")
  const [deleteNote,   setDeleteNote]   = useState("")

  const [transferItem,         setTransferItem]         = useState<Equipment | null>(null)
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | "">("")
  const [roomSearchQuery,      setRoomSearchQuery]      = useState("")
  const [selectedRoomId,       setSelectedRoomId]       = useState("")

  // helpers
  const resetDeleteDialog = () => { setDeleteItem(null); setDeleteReason(""); setDeleteNote("") }

  const resetTransferDialog = () => {
    setTransferItem(null)
    setSelectedBuildingType("")
    setRoomSearchQuery("")
    setSelectedRoomId("")
  }

  const handleDeleteConfirm = () => {
    if (deleteItem && deleteReason) {
      onDelete(deleteItem.id, deleteReason, deleteReason === "other" ? deleteNote : undefined)
      resetDeleteDialog()
    }
  }

  const handleTransferConfirm = () => {
    if (transferItem && selectedRoomId) {
      onTransfer(transferItem.id, selectedRoomId)
      resetTransferDialog()
    }
  }

  // building-type chip helper
  const btMeta = (bt: BuildingType) => {
    switch (bt) {
      case "warehouse": return {
        icon: <Boxes className="mr-1.5 h-3.5 w-3.5" />,
        cls : "bg-usf-green/10 text-usf-green border border-usf-green/20",
      }
      case "classroom": return {
        icon: <School className="mr-1.5 h-3.5 w-3.5" />,
        cls : "bg-usf-gold/20 text-usf-darkGold border border-usf-gold/30",
      }
      case "office":    return {
        icon: <Building2 className="mr-1.5 h-3.5 w-3.5" />,
        cls : "bg-usf-lightGreen/10 text-usf-lightGreen border border-usf-lightGreen/20",
      }
      default:          return { icon: null, cls: "bg-gray-100 text-gray-800" }
    }
  }

  // rules for enabling actions
  const canDelete = (e: Equipment) => e.buildingType === "warehouse"

  const canTransferFromWarehouse = (e: Equipment) =>
    !(e.buildingType === "warehouse" && !(e.status === "stored" || e.status === "maintenance"))

  const canSelect = (e: Equipment) => {
    if (multipleAction === "transfer")
      return e.buildingType !== "warehouse"
        ? true
        : e.status !== "replaced" && canTransferFromWarehouse(e)
    if (multipleAction === "delete")
      return canDelete(e)
    return true
  }

  // checkbox toggle
  const toggleSelected = (id: string) =>
    setSelectedItems(selectedItems.includes(id)
      ? selectedItems.filter((i) => i !== id)
      : [...selectedItems, id],
    )

  // transfer-dialog helpers
  const handleBuildingTypeSelect = (bt: BuildingType) => {
    setSelectedBuildingType(bt)
    setRoomSearchQuery("")
    setSelectedRoomId("")

    if (bt === "warehouse") {
      const wh = allRooms.find((r) => r.buildingType === "warehouse")
      if (wh) setSelectedRoomId(wh.id)
    }
  }

  const filteredRooms =
    selectedBuildingType === "warehouse"
      ? allRooms.filter((r) => r.buildingType === "warehouse")
      : roomSearchQuery
          ? searchRoomsByPrefix(roomSearchQuery, selectedBuildingType as BuildingType)
          : selectedBuildingType
              ? allRooms.filter((r) => r.buildingType === selectedBuildingType)
              : []

  // render
  return (
    <>
      {/* table */}
      <div className="rounded-md">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {isMultipleSelect && <TableHead className="w-[50px]"><span className="sr-only">Select</span></TableHead>}
              <TableHead className="font-semibold">Equipment</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Serial #</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Imported</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">Last&nbsp;Updated</TableHead>
              {!isMultipleSelect && <TableHead className="text-right font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {equipment.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isMultipleSelect ? 8 : 7}
                  className="text-center py-10 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Boxes className="h-8 w-8 text-usf-gold/60" />
                    <p>No equipment found. Add some equipment to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              equipment.map((e) => {
                const sMeta = getStatusDetails(e.status)
                const bMeta = btMeta(e.buildingType)

                return (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    {isMultipleSelect && (
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(e.id)}
                          onCheckedChange={() => canSelect(e) && toggleSelected(e.id)}
                          disabled={!canSelect(e)}
                        />
                      </TableCell>
                    )}

                    {/* model & icon */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEquipmentTypeIcon(e.equipmentType)}</span>
                        {e.model}
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell capitalize">{e.equipmentType}</TableCell>

                    {/* status pill */}
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${sMeta.color}`}>
                        {sMeta.label}
                      </span>
                    </TableCell>

                    {/* location pill */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${bMeta.cls}`}>
                          {bMeta.icon}
                          {e.buildingType.charAt(0).toUpperCase() + e.buildingType.slice(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">{e.roomName}</span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell font-mono text-sm">{e.serialNumber}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{e.dateImported}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{getTimeAgo(e.lastUpdated)} ago</span>
                        <span className="text-xs opacity-60">{new Date(e.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </TableCell>

                    {!isMultipleSelect && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(e)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              disabled={!canTransferFromWarehouse(e)}
                              onClick={() => setTransferItem(e)}
                            >
                              <MoveRight className="mr-2 h-4 w-4" /> Transfer
                              {!canTransferFromWarehouse(e) && (
                                <span className="ml-2 text-xs text-muted-foreground">(Not eligible)</span>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              disabled={!canDelete(e)}
                              className="text-red-600"
                              onClick={() => setDeleteItem(e)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                              {!canDelete(e) && (
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

      {/* Delete dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && resetDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              Please specify the reason for deleting&nbsp;
              <span className="font-medium">{deleteItem?.model}</span>.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={deleteReason} onValueChange={setDeleteReason} className="space-y-3 py-4">
            {(["broken", "obsolete", "other"] as DeleteReason[]).map((r) => (
              <div key={r} className="flex items-center space-x-2">
                <RadioGroupItem value={r} id={r} />
                <Label htmlFor={r} className="capitalize">{r.replace("-", " ")}</Label>
              </div>
            ))}
          </RadioGroup>

          {deleteReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="deleteNote">Explanation</Label>
              <Textarea
                id="deleteNote"
                rows={3}
                value={deleteNote}
                onChange={(e) => setDeleteNote(e.target.value)}
                placeholder="Add details"
              />
            </div>
          )}

          {deleteReason === "other" && !deleteNote && (
            <p className="flex items-center gap-1 text-amber-600 text-sm pt-2">
              <AlertCircle className="h-4 w-4" /> Please provide an explanation
            </p>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={resetDeleteDialog}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!deleteReason || (deleteReason === "other" && !deleteNote)}
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={!!transferItem} onOpenChange={(o) => !o && resetTransferDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Equipment</DialogTitle>
            <DialogDescription>
              Select a new location for&nbsp;
              <span className="font-medium">{transferItem?.model}</span>
              &nbsp;({transferItem?.equipmentType})
            </DialogDescription>
          </DialogHeader>

          {/* step 1: choose building type */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">1. Building type</h3>
            <Select value={selectedBuildingType} onValueChange={(v) => handleBuildingTypeSelect(v as BuildingType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select building type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warehouse"><Boxes className="mr-2 h-4 w-4" />Warehouse</SelectItem>
                <SelectItem value="classroom"><School className="mr-2 h-4 w-4" />Classroom</SelectItem>
                <SelectItem value="office"><Building2 className="mr-2 h-4 w-4" />Office</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* step 2: choose room (if not warehouse) */}
          {selectedBuildingType && selectedBuildingType !== "warehouse" && (
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-medium">2. Search room</h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. HON 203"
                  className="pl-8"
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                />
              </div>

              {/* results */}
              <div className="mt-2 border rounded-md max-h-[200px] overflow-y-auto">
                {filteredRooms.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {roomSearchQuery ? "No rooms found" : "Type to search for rooms"}
                  </div>
                ) : (
                  filteredRooms.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 ${
                        selectedRoomId === r.id ? "bg-usf-green/10" : ""
                      }`}
                      onClick={() => setSelectedRoomId(r.id)}
                    >
                      <div className="flex items-center min-w-0">
                        {btMeta(r.buildingType).icon}
                        <span className="ml-2 truncate">{r.name}</span>
                      </div>
                      {selectedRoomId === r.id && <div className="h-2 w-2 rounded-full bg-usf-green" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* warehouse auto-selected chip */}
          {selectedBuildingType === "warehouse" && (
            <div className="pt-4 space-y-2">
              <h3 className="text-sm font-medium">2. Selected location</h3>
              <div className="p-3 border rounded-md bg-usf-green/5 flex items-center">
                <Boxes className="mr-2 h-4 w-4 text-usf-green" /> HON Warehouse
              </div>
            </div>
          )}

          {/* status-change notice */}
          {transferItem && selectedBuildingType && (
            <div className="p-3 border rounded-md bg-amber-50 text-amber-800 text-sm mt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Status will update on transfer:</p>
                  {transferItem.buildingType === "warehouse" && selectedBuildingType !== "warehouse" && (
                    <p>Current status will become <span className="font-medium">In&nbsp;Use</span></p>
                  )}
                  {transferItem.buildingType !== "warehouse" && selectedBuildingType === "warehouse" && (
                    <>
                      {transferItem.status === "in-use" && (
                        <p>Status <span className="font-medium">In&nbsp;Use</span> → <span className="font-medium">Stored</span></p>
                      )}
                      {transferItem.status === "need-replacement" && (
                        <p>Status <span className="font-medium">Need&nbsp;Replacement</span> → <span className="font-medium">Replaced</span></p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={resetTransferDialog}>Cancel</Button>
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
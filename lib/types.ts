export type BuildingType = "classroom" | "office" | "warehouse"

export interface Room {
  id: string
  name: string
  buildingType: BuildingType
}

export type WarehouseStatus = "stored" | "maintenance" | "replaced"
export type UsageStatus = "in-use" | "need-replacement"
export type EquipmentStatus = WarehouseStatus | UsageStatus

export type DeleteReason = "broken" | "obsolete" | "other"

export interface Equipment {
  id: string
  model: string
  equipmentType: string
  serialNumber: string
  dateImported: string // MM/YYYY format
  status: EquipmentStatus
  roomId: string
  dateAdded: string
  lastUpdated: string
  deleteReason?: string
  deleteNote?: string
}

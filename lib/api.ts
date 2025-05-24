import { supabase } from "@/lib/supabase"
import type { Equipment, BuildingType, EquipmentStatus } from "@/lib/types"
import { allRooms, getRoomById } from "@/lib/rooms"
import { v4 as uuidv4 } from "uuid"

// helpers
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

// cache for room ids
interface DbLocation {
  id: string
  room_name: string
  building_type: BuildingType
}

interface DbEquipmentWithLocation {
  id: string
  model: string
  equipment_type: string
  serial_number: string
  date_imported: string
  status: EquipmentStatus
  date_added: string
  last_updated: string
  delete_reason?: string | null
  delete_note?: string | null
  location_id: string
  room_name: string
  building_type: BuildingType
}

const roomIdCache: Record<string, DbLocation> = {}

// get db location by local id
const getDbLocationByLocalId = async (localId: string) => {
  if (isUuid(localId)) return { id: localId }
  if (roomIdCache[localId]) return roomIdCache[localId]
  const room = getRoomById(localId)
  if (!room) throw new Error(`Unknown room "${localId}"`)
  const { data, error } = await supabase
    .from("locations")
    .select("id,room_name,building_type")
    .eq("room_name", room.name)
    .single()
  if (error || !data) throw new Error(`DB location "${room.name}" not found`)
  roomIdCache[localId] = data as DbLocation
  return data as DbLocation
}

// mappers DB→UI
const mapDbEquipmentToClient = (i: DbEquipmentWithLocation): Equipment => ({
  id: i.id,
  model: i.model,
  equipmentType: i.equipment_type,
  serialNumber: i.serial_number,
  dateImported: i.date_imported,
  status: i.status as EquipmentStatus,
  roomId: i.location_id,
  roomName: i.room_name,
  buildingType: i.building_type,
  dateAdded: i.date_added,
  lastUpdated: i.last_updated,
  deleteReason: i.delete_reason ?? undefined,
  deleteNote: i.delete_note ?? undefined,
})

const mapClientEquipmentToDb = (e: Equipment) => ({
  id: e.id,
  model: e.model,
  equipment_type: e.equipmentType,
  serial_number: e.serialNumber,
  date_imported: e.dateImported,
  status: e.status,
  date_added: e.dateAdded,
  last_updated: e.lastUpdated,
  delete_reason: e.deleteReason ?? null,
  delete_note: e.deleteNote ?? null,
})

// fetch all
export async function getAllEquipment(): Promise<Equipment[]> {
  const { data, error } = await supabase.from("equipment_with_location").select("*")
  if (error || !data) {
    console.error("Error fetching equipment:", error?.message)
    return []
  }
  return data.map(mapDbEquipmentToClient)
}

// add rows
export async function addEquipment(
  items: Omit<
    Equipment,
    "id" | "status" | "dateAdded" | "lastUpdated" | "roomId" | "buildingType" | "roomName"
  >[],
): Promise<Equipment[]> {
  const warehouseLocal = allRooms.find((r) => r.buildingType === "warehouse")
  if (!warehouseLocal) throw new Error("Missing warehouse in local data")

  const warehouseDb = await getDbLocationByLocalId(warehouseLocal.id)
  const nowIso = new Date().toISOString()

  const payload = items.map((e) => ({
    id: uuidv4(),
    model: e.model,
    equipment_type: e.equipmentType,
    serial_number: e.serialNumber,
    date_imported: e.dateImported,
    status: "stored",
    date_added: nowIso,
    last_updated: nowIso,
    location_id: warehouseDb.id,
  }))

  const { data, error } = await supabase.rpc("add_equipment_with_location", {
    items: payload,
  })
  if (error || !data) throw new Error(error?.message ?? "RPC add failed")
  return (data as DbEquipmentWithLocation[]).map(mapDbEquipmentToClient)
}

// update
export async function updateEquipment(updated: Equipment): Promise<Equipment | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("equipment")
    .update({ ...mapClientEquipmentToDb(updated), last_updated: now })
    .eq("id", updated.id)
    .select()
    .single()
  if (error || !data) {
    console.error("Update equipment error:", error?.message)
    return null
  }
  const loc =
    updated.roomId && isUuid(updated.roomId)
      ? { id: updated.roomId }
      : await getDbLocationByLocalId(updated.roomId)
  return mapDbEquipmentToClient({
    ...data,
    location_id: loc.id,
    room_name: updated.roomName,
    building_type: updated.buildingType,
  })
}

// delete
export async function deleteEquipment(id: string, reason: string, note?: string): Promise<boolean> {
  const { error } = await supabase.rpc("delete_equipment_soft", {
    p_id: id,
    p_reason: reason,
    p_note: note ?? null,
  })
  if (error) {
    console.error("Delete RPC error:", error.message)
    return false
  }
  return true
}

// bulk delete
export async function deleteMultipleEquipment(
  ids: string[],
  reason: string,
  note?: string,
): Promise<boolean> {
  const { error } = await supabase.rpc("delete_equipment_soft_bulk", {
    p_ids: ids,
    p_reason: reason,
    p_note: note ?? null,
  })
  if (error) {
    console.error("Bulk delete RPC error:", error.message)
    return false
  }
  return true
}

// bulk status
export async function updateMultipleStatus(
  ids: string[],
  newStatus: EquipmentStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("equipment")
    .update({ status: newStatus, last_updated: new Date().toISOString() })
    .in("id", ids)
  if (error) {
    console.error("Bulk status update error:", error.message)
    return false
  }
  return true
}

// transfer single
export async function transferEquipment(
  id: string,
  toLocalRoomId: string,
  fromLocalRoomId: string,
  prevStatus: EquipmentStatus,
  newStatus: EquipmentStatus,
): Promise<boolean> {
  const res = await transferMultipleEquipment(
    [
      { id, previousRoomId: fromLocalRoomId, previousStatus: prevStatus, newStatus },
    ],
    toLocalRoomId,
  )
  return res
}

// transfer bulk
export async function transferMultipleEquipment(
  items: { id: string; previousRoomId: string; previousStatus: EquipmentStatus; newStatus: EquipmentStatus }[],
  toLocalRoomId: string,
): Promise<boolean> {
  const to = await getDbLocationByLocalId(toLocalRoomId)
  const ts = new Date().toISOString()

  const transfers = await Promise.all(
    items.map(async (it) => {
      const from = await getDbLocationByLocalId(it.previousRoomId)
      return {
        equipment_id: it.id,
        from_location_id: from.id,
        to_location_id: to.id,
        previous_status: it.previousStatus,
        new_status: it.newStatus,
        ts,
      }
    }),
  )

  const { error } = await supabase.rpc("transfer_equipment_batch", {
    transfers,
  })
  if (error) {
    console.error("Transfer batch RPC error:", error.message)
    return false
  }
  return true
}

// init rooms
export async function initializeRooms(rooms: { name: string; buildingType: BuildingType }[]): Promise<boolean> {
  const batch = rooms.map((r) => ({ room_name: r.name, building_type: r.buildingType, created_at: new Date().toISOString() }))
  const { error } = await supabase.from("locations").upsert(batch, { onConflict: "room_name" })
  if (error) {
    console.error("Initialize rooms error:", error.message)
    return false
  }
  return true
}

// schema verify
export async function verifyDatabaseSchema(): Promise<boolean> {
  const tables = ["locations", "equipment", "equipment_location", "equipment_transfer_history", "equipment_with_location"]
  for (const t of tables) {
    const { error } = await supabase.from(t).select("count", { count: "exact", head: true })
    if (error) {
      console.error(`Schema verification failed for "${t}":`, error.message)
      return false
    }
  }
  return true
}

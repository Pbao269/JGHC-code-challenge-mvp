import { supabase } from "@/lib/supabase"
import type { Equipment, BuildingType, EquipmentStatus } from "@/lib/types"
import { allRooms, getRoomById } from "@/lib/rooms"
import { v4 as uuidv4 } from "uuid"

// helpers
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
//
const getDbLocationByLocalId = async (localId: string) => {
  if (isUuid(localId)) return { id: localId } // already uuid
  const room = getRoomById(localId)
  if (!room) throw new Error(`Unknown room "${localId}"`)
  const { data, error } = await supabase
    .from("locations")
    .select("id,room_name,building_type")
    .eq("room_name", room.name)
    .single()
  if (error || !data) throw new Error(`DB location "${room.name}" not found`)
  return data as { id: string; room_name: string; building_type: BuildingType }
}

// mappers DB→UI
const mapDbEquipmentToClient = (item: Record<string, any>): Equipment => ({
  id:            item.id,
  model:         item.model,
  equipmentType: item.equipment_type,
  serialNumber:  item.serial_number,
  dateImported:  item.date_imported,
  status:        item.status as EquipmentStatus,
  roomId:        item.location_id,
  roomName:      item.room_name,
  buildingType:  item.building_type,
  dateAdded:     item.date_added,
  lastUpdated:   item.last_updated,
  deleteReason:  item.delete_reason ?? undefined,
  deleteNote:    item.delete_note ?? undefined,
})
//
const mapClientEquipmentToDb = (item: Equipment) => ({
  id:             item.id,
  model:          item.model,
  equipment_type: item.equipmentType,
  serial_number:  item.serialNumber,
  date_imported:  item.dateImported,
  status:         item.status,
  date_added:     item.dateAdded,
  last_updated:   item.lastUpdated,
  delete_reason:  item.deleteReason ?? null,
  delete_note:    item.deleteNote ?? null,
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
  newEquipment: Omit<
    Equipment,
    "id" | "status" | "dateAdded" | "lastUpdated" | "roomId" | "buildingType" | "roomName"
  >[],
): Promise<Equipment[]> {
  const warehouseLocal = allRooms.find((r) => r.buildingType === "warehouse")
  if (!warehouseLocal) throw new Error("Missing warehouse in local data")
  const { data: existing } = await supabase
    .from("locations")
    .select("*")
    .eq("building_type", "warehouse")
    .limit(1)
  let warehouseLocation: { id: string; room_name: string; building_type: BuildingType }
  if (existing && existing.length) {
    warehouseLocation = {
      id: existing[0].id,
      room_name: existing[0].room_name,
      building_type: existing[0].building_type as BuildingType,
    }
  } else {
    const { data: created, error } = await supabase
      .from("locations")
      .insert({
        room_name: warehouseLocal.name,
        building_type: warehouseLocal.buildingType,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error || !created) throw new Error(error?.message ?? "Failed to create warehouse")
    warehouseLocation = {
      id: created.id,
      room_name: created.room_name,
      building_type: created.building_type as BuildingType,
    }
  }
  const now = new Date().toISOString()
  const rows = newEquipment.map((e) => ({
    id: uuidv4(),
    model: e.model,
    equipment_type: e.equipmentType,
    serial_number: e.serialNumber,
    date_imported: e.dateImported,
    status: "stored",
    date_added: now,
    last_updated: now,
  }))
  const { data: inserted, error: eqErr } = await supabase.from("equipment").insert(rows).select()
  if (eqErr || !inserted) throw new Error(eqErr?.message ?? "Insert failed")
  const locRows = inserted.map((i) => ({
    equipment_id: i.id,
    location_id: warehouseLocation.id,
    updated_at: now,
  }))
  const { error: locErr } = await supabase.from("equipment_location").insert(locRows)
  if (locErr) throw new Error(locErr.message)
  return inserted.map((i) =>
    mapDbEquipmentToClient({
      ...i,
      location_id: warehouseLocation.id,
      room_name: warehouseLocation.room_name,
      building_type: warehouseLocation.building_type,
    }),
  )
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
  const { data: loc } = await supabase
    .from("equipment_location")
    .select("location_id")
    .eq("equipment_id", updated.id)
    .single()
  const { data: room } = loc
    ? await supabase.from("locations").select("*").eq("id", loc.location_id).single()
    : { data: null }
  return mapDbEquipmentToClient({ ...data, location_id: room?.id, room_name: room?.room_name, building_type: room?.building_type })
}

// delete
export async function deleteEquipment(id: string, deleteReason: string, deleteNote?: string): Promise<boolean> {
  const { error } = await supabase
    .from("equipment")
    .update({ delete_reason: deleteReason, delete_note: deleteNote ?? null, last_updated: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    console.error("Delete equipment error:", error.message)
    return false
  }
  const { error: delErr } = await supabase.from("equipment").delete().eq("id", id)
  if (delErr) {
    console.error("Delete equipment row error:", delErr.message)
    return false
  }
  return true
}

// bulk delete
export async function deleteMultipleEquipment(ids: string[], deleteReason: string, deleteNote?: string): Promise<boolean> {
  const { error: updErr } = await supabase
    .from("equipment")
    .update({ delete_reason: deleteReason, delete_note: deleteNote ?? null, last_updated: new Date().toISOString() })
    .in("id", ids)
  if (updErr) {
    console.error("Bulk update error:", updErr.message)
    return false
  }
  const { error: delErr } = await supabase.from("equipment").delete().in("id", ids)
  if (delErr) {
    console.error("Bulk delete error:", delErr.message)
    return false
  }
  return true
}

// bulk status
export async function updateMultipleStatus(ids: string[], newStatus: EquipmentStatus): Promise<boolean> {
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
  const to = await getDbLocationByLocalId(toLocalRoomId) //
  const from = await getDbLocationByLocalId(fromLocalRoomId) //
  const { error } = await supabase.rpc("transfer_equipment", {
    p_equipment_id: id,
    p_to_location_id: to.id,
    p_from_location_id: from.id,
    p_previous_status: prevStatus,
    p_new_status: newStatus,
    p_timestamp: new Date().toISOString(),
  })
  if (error) {
    console.error("Transfer RPC error:", error.message)
    return false
  }
  return true
}

// transfer bulk
export async function transferMultipleEquipment(
  items: { id: string; previousRoomId: string; previousStatus: EquipmentStatus; newStatus: EquipmentStatus }[],
  toLocalRoomId: string,
): Promise<boolean> {
  const to = await getDbLocationByLocalId(toLocalRoomId) //
  for (const itm of items) {
    const from = await getDbLocationByLocalId(itm.previousRoomId) //
    const ok = await transferEquipment(itm.id, to.id, from.id, itm.previousStatus, itm.newStatus)
    if (!ok) return false
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

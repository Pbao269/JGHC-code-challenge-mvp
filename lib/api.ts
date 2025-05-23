import { supabase } from "@/lib/supabase";
import type { Equipment, BuildingType, EquipmentStatus } from "@/lib/types";
import { allRooms } from "@/lib/rooms";
import { v4 as uuidv4 } from "uuid";



// Maps database equipment record to client-side Equipment type
const mapDbEquipmentToClient = (
  item: Record<string, any>,
  location: { id: string; room_name: string; building_type: BuildingType } | null
): Equipment => ({
  id:            item.id,
  model:         item.model,
  equipmentType: item.equipment_type,
  serialNumber:  item.serial_number,
  dateImported:  item.date_imported,
  status:        item.status as EquipmentStatus,
  roomId:        location?.id || "",
  dateAdded:     item.date_added,
  lastUpdated:   item.last_updated,
  deleteReason:  item.delete_reason ?? undefined,
  deleteNote:    item.delete_note  ?? undefined,
});

// Maps client-side Equipment type to database format
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
  delete_note:    item.deleteNote   ?? null,
});



// Fetches all equipment with their current locations from the database
export async function getAllEquipment(): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from("equipment_with_location")
    .select("*");

  if (error) {
    console.error("Error fetching equipment:", error.message);
    return [];
  }
  if (!data) return [];

  return data.map((item) =>
    mapDbEquipmentToClient(item, {
      id:            item.location_id,
      room_name:     item.room_name,
      building_type: item.building_type,
    }),
  );
}

// Adds new equipment to the warehouse
export async function addEquipment(
  newEquipment: Omit<
    Equipment,
    "id" | "dateAdded" | "lastUpdated" | "roomId" | "status"
  >[],
): Promise<Equipment[]> {
  // Ensure warehouse exists in local data
  const warehouseLocal = allRooms.find((r) => r.buildingType === "warehouse");
  if (!warehouseLocal) throw new Error("Missing warehouse in local data");

  // Check if warehouse exists in database
  const { data: existingWarehouse } = await supabase
    .from("locations")
    .select("*")
    .eq("building_type", "warehouse")
    .limit(1);

  let warehouseLocation: { id: string; room_name: string; building_type: BuildingType };

  if (existingWarehouse && existingWarehouse.length > 0) {
    warehouseLocation = {
      id:            existingWarehouse[0].id,
      room_name:     existingWarehouse[0].room_name,
      building_type: existingWarehouse[0].building_type as BuildingType,
    };
  } else {
    // Create warehouse if it doesn't exist
    const { data: created, error } = await supabase
      .from("locations")
      .insert({
        room_name:     warehouseLocal.name,
        building_type: warehouseLocal.buildingType,
        created_at:    new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !created)
      throw new Error(error?.message ?? "Failed to create warehouse");
    warehouseLocation = {
      id:            created.id,
      room_name:     created.room_name,
      building_type: created.building_type as BuildingType,
    };
  }

  // Insert equipment records
  const now  = new Date().toISOString();
  const rows = newEquipment.map((e) => ({
    id:             uuidv4(),
    model:          e.model,
    equipment_type: e.equipmentType,
    serial_number:  e.serialNumber,
    date_imported:  e.dateImported,
    status:         "stored",
    date_added:     now,
    last_updated:   now,
  }));

  const { data: inserted, error: eqErr } = await supabase
    .from("equipment")
    .insert(rows)
    .select();

  if (eqErr || !inserted) throw new Error(eqErr?.message ?? "Insert failed");

  // Create location records for each equipment
  const locRows = inserted.map((i) => ({
    equipment_id: i.id,
    location_id:  warehouseLocation.id,
    updated_at:   now,
  }));

  const { error: locErr } = await supabase
    .from("equipment_location")
    .insert(locRows);

  if (locErr) throw new Error(locErr.message);

  return inserted.map((i) => mapDbEquipmentToClient(i, warehouseLocation));
}

// Updates equipment details in the database
export async function updateEquipment(
  updated: Equipment,
): Promise<Equipment | null> {
  const now                 = new Date().toISOString();
  const { data, error }     = await supabase
    .from("equipment")
    .update({ ...mapClientEquipmentToDb(updated), last_updated: now })
    .eq("id", updated.id)
    .select()
    .single();

  if (error || !data) {
    console.error("Update equipment error:", error?.message);
    return null;
  }

  // Get location details for the updated equipment
  const { data: loc } = await supabase
    .from("equipment_location")
    .select("location_id")
    .eq("equipment_id", updated.id)
    .single();

  const { data: room } = loc
    ? await supabase
        .from("locations")
        .select("*")
        .eq("id", loc.location_id)
        .single()
    : { data: null };

  return mapDbEquipmentToClient(data, room);
}

// Deletes equipment from the database
export async function deleteEquipment(
  id: string,
  deleteReason: string,
  deleteNote?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("equipment")
    .update({
      delete_reason: deleteReason,
      delete_note:   deleteNote ?? null,
      last_updated:  new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Delete equipment error:", error.message);
    return false;
  }

  const { error: delErr } = await supabase.from("equipment").delete().eq("id", id);
  if (delErr) {
    console.error("Delete equipment row error:", delErr.message);
    return false;
  }
  return true;
}

// Deletes multiple equipment items from the database
export async function deleteMultipleEquipment(
  ids: string[],
  deleteReason: string,
  deleteNote?: string,
): Promise<boolean> {
  const { error: updErr } = await supabase
    .from("equipment")
    .update({
      delete_reason: deleteReason,
      delete_note:   deleteNote ?? null,
      last_updated:  new Date().toISOString(),
    })
    .in("id", ids);

  if (updErr) {
    console.error("Bulk update (delete_reason) error:", updErr.message);
    return false;
  }

  const { error: delErr } = await supabase.from("equipment").delete().in("id", ids);
  if (delErr) {
    console.error("Bulk delete error:", delErr.message);
    return false;
  }
  return true;
}

// Updates status for multiple equipment items
export async function updateMultipleStatus(
  ids: string[],
  newStatus: EquipmentStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from("equipment")
    .update({
      status:        newStatus,
      last_updated:  new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    console.error("Bulk status update error:", error.message);
    return false;
  }
  return true;
}


// Transfers equipment between locations
export async function transferEquipment(
  id: string,
  toRoomId: string,
  fromRoomId: string,
  prevStatus: EquipmentStatus,
  newStatus: EquipmentStatus,
): Promise<boolean> {
  const { error } = await supabase.rpc("transfer_equipment", {
    p_equipment_id:     id,
    p_to_location_id:   toRoomId,
    p_from_location_id: fromRoomId,
    p_previous_status:  prevStatus,
    p_new_status:       newStatus,
    p_timestamp:        new Date().toISOString(),
  });

  if (error) {
    console.error("Transfer RPC error:", error.message);
    return false;
  }
  return true;
}

// Transfers multiple equipment items between locations
export async function transferMultipleEquipment(
  items: {
    id: string;
    previousRoomId: string;
    previousStatus: EquipmentStatus;
    newStatus: EquipmentStatus;
  }[],
  toRoomId: string,
): Promise<boolean> {
  for (const itm of items) {
    const ok = await transferEquipment(
      itm.id,
      toRoomId,
      itm.previousRoomId,
      itm.previousStatus,
      itm.newStatus,
    );
    if (!ok) return false;
  }
  return true;
}


// Initializes rooms in the database
export async function initializeRooms(
  rooms: { name: string; buildingType: BuildingType }[],
): Promise<boolean> {
  const batch = rooms.map((r) => ({
    room_name:     r.name,
    building_type: r.buildingType,
    created_at:    new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("locations")
    .upsert(batch, { onConflict: "room_name" });

  if (error) {
    console.error("Initialize rooms error:", error.message);
    return false;
  }
  return true;
}


// Verifies database schema by checking all required tables
export async function verifyDatabaseSchema(): Promise<boolean> {
  const tables = [
    "locations",
    "equipment",
    "equipment_location",
    "equipment_transfer_history",
    "equipment_with_location",
  ];

  for (const t of tables) {
    const { error } = await supabase
      .from(t)
      .select("count", { count: "exact", head: true });
    if (error) {
      console.error(`Schema verification failed for "${t}":`, error.message);
      return false;
    }
  }
  return true;
}


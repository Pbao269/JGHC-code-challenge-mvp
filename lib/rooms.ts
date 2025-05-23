import type { Room, BuildingType } from "@/lib/types"

// Create a single warehouse room
const warehouseRoom: Room = {
  id: "warehouse-1",
  name: "HON Warehouse",
  buildingType: "warehouse",
}

// Generate classroom and office rooms for the Honor building
const generateHonorRooms = (): Room[] => {
  const rooms: Room[] = []

  // Add the single warehouse room
  rooms.push(warehouseRoom)

  // Generate rooms for 4 floors
  for (let floor = 1; floor <= 4; floor++) {
    // Each floor has 12 rooms (8 classrooms and 4 offices)
    for (let roomNum = 1; roomNum <= 12; roomNum++) {
      const roomNumber = `${floor}${roomNum.toString().padStart(2, "0")}`

      // First 8 rooms on each floor are classrooms, last 4 are offices
      const buildingType: BuildingType = roomNum <= 8 ? "classroom" : "office"

      rooms.push({
        id: `${buildingType}-${floor}-${roomNum}`,
        name: `HON ${roomNumber}`,
        buildingType,
      })
    }
  }

  return rooms
}

// Generate all rooms
export const allRooms: Room[] = generateHonorRooms()

// Helper function to get room by ID
export const getRoomById = (id: string): Room | undefined => {
  return allRooms.find((room) => room.id === id)
}

// Helper function to get rooms by building type
export const getRoomsByBuildingType = (buildingType: BuildingType): Room[] => {
  return allRooms.filter((room) => room.buildingType === buildingType)
}

// Helper function to search rooms by prefix and building type
export const searchRoomsByPrefix = (prefix: string, buildingType?: BuildingType): Room[] => {
  const normalizedPrefix = prefix.toUpperCase()

  return allRooms.filter((room) => {
    const matchesPrefix = room.name.toUpperCase().includes(normalizedPrefix)
    const matchesType = buildingType ? room.buildingType === buildingType : true
    return matchesPrefix && matchesType
  })
}

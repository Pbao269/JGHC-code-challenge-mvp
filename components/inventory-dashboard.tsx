"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Search, Boxes, School, Building2, FilterX, Settings, MoveRight, AlertCircle, Trash2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import EquipmentTable from "@/components/equipment-table"
import EquipmentForm from "@/components/equipment-form"
import MultipleStatusChange from "@/components/multiple-status-change"
import MultipleTransfer from "@/components/multiple-transfer"
import MultipleDelete from "@/components/multiple-delete"
import DeletedItemsView from "@/components/deleted-items-view"
import type { Equipment, BuildingType, EquipmentStatus } from "@/lib/types"
import { getRoomById, allRooms } from "@/lib/rooms"
import { 
  getAllEquipment, 
  addEquipment as addEquipmentApi, 
  updateEquipment as updateEquipmentApi,
  deleteEquipment as deleteEquipmentApi,
  transferEquipment as transferEquipmentApi,
  deleteMultipleEquipment as deleteMultipleEquipmentApi,
  updateMultipleStatus as updateMultipleStatusApi,
  transferMultipleEquipment as transferMultipleEquipmentApi,
  initializeRooms} from "@/lib/api"
import { testSupabaseConnection } from "@/lib/supabase"

// Main inventory dashboard component that manages equipment and locations
export default function InventoryDashboard() {
  // State for equipment list and UI controls
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [isAddingEquipment, setIsAddingEquipment] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [activeTab, setActiveTab] = useState<BuildingType | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "all">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for multiple selection mode
  const [isMultipleSelect, setIsMultipleSelect] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [multipleAction, setMultipleAction] = useState<"transfer" | "status" | "delete" | null>(null)

  // State for deleted items view
  const [showDeletedItems, setShowDeletedItems] = useState(false)

  // Function to refresh equipment data
  const refreshEquipment = async () => {
    try {
      const data = await getAllEquipment()
      setEquipment(data)
    } catch (err) {
      console.error("Error refreshing equipment:", err)
    }
  }

  // Load saved filter states from localStorage after hydration
  useEffect(() => {
    // Only run on client side after hydration
    const savedActiveTab = localStorage.getItem('inventory-active-tab') as BuildingType | "all" | null
    const savedStatusFilter = localStorage.getItem('inventory-status-filter') as EquipmentStatus | "all" | null
    const savedSearchQuery = localStorage.getItem('inventory-search-query')

    if (savedActiveTab) setActiveTab(savedActiveTab)
    if (savedStatusFilter) setStatusFilter(savedStatusFilter)
    if (savedSearchQuery) setSearchQuery(savedSearchQuery)
  }, [])

  // Save filter states to localStorage when they change
  useEffect(() => {
    localStorage.setItem('inventory-active-tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem('inventory-status-filter', statusFilter)
  }, [statusFilter])

  useEffect(() => {
    localStorage.setItem('inventory-search-query', searchQuery)
  }, [searchQuery])

  // Initialize database and fetch data on component mount
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Test database connection
        console.log("Testing Supabase connection...");
        const isConnected = await testSupabaseConnection();
        if (!isConnected) {
          throw new Error("Failed to connect to Supabase. Please check your connection and credentials in .env.local file.");
        }
        
        // Initialize rooms
        console.log("Starting room initialization...");
        const roomsData = allRooms.map(room => ({
          id: room.id,
          name: room.name,
          buildingType: room.buildingType
        }));
        
        let roomsInitialized = false;
        try {
          roomsInitialized = await initializeRooms(roomsData);
          if (roomsInitialized) {
            console.log("Room initialization completed successfully");
          } else {
            console.warn("Room initialization returned false - some rooms may be missing");
          }
        } catch (roomError) {
          console.error("Room initialization error:", roomError);
        }
        
        // Fetch equipment data
        console.log("Fetching equipment...");
        try {
          const data = await getAllEquipment();
          
          if (data.length === 0 && !roomsInitialized) {
            console.warn("No equipment found and rooms may not be initialized correctly");
            setError("Database setup incomplete. Please ensure Supabase is properly configured with the correct schema.");
          } else {
            console.log(`Fetched ${data.length} equipment items`);
            setEquipment(data);
            setError(null);
          }
        } catch (equipmentError) {
          console.error("Error fetching equipment:", equipmentError);
          
          if (!roomsInitialized) {
            throw new Error("Database initialization failed. Please check your Supabase setup and permissions.");
          } else {
            throw new Error("Failed to fetch equipment data. Database tables may exist but data access failed.");
          }
        }
      } catch (err) {
        console.error("Error initializing data:", err);
        
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to initialize application. Please check Supabase connection and setup.");
        }
        
        setEquipment([]);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Handles adding new equipment
  const handleAddEquipment = async (
    newEquipment: Omit<Equipment, "id" | "status" | "dateAdded" | "lastUpdated" | "roomId" | "buildingType" | "roomName">[],
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const addedEquipment = await addEquipmentApi(newEquipment)
      
      if (addedEquipment.length > 0) {
        setIsAddingEquipment(false)
        await refreshEquipment() // Refresh to get latest data with proper sorting
      } else {
        setError("No equipment was added. Please check the form and try again.")
      }
    } catch (err) {
      console.error("Error adding equipment:", err)
      
      if (err instanceof Error) {
        if (err.message.includes('warehouse')) {
          setError("Failed to add equipment: Warehouse location issue. Please ensure the warehouse room exists.")
        } else {
          setError(`Failed to add equipment: ${err.message}`)
        }
      } else {
        setError("Failed to add equipment. Please check your connection and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handles updating existing equipment
  const handleUpdateEquipment = async (updatedEquipmentList: Omit<Equipment, "id" | "status" | "dateAdded" | "lastUpdated" | "roomId" | "buildingType" | "roomName">[]) => {
    try {
      setIsLoading(true)
      
      if (!editingEquipment || updatedEquipmentList.length === 0) {
        throw new Error("Invalid equipment data for update")
      }
      
      // Reconstruct the complete equipment object with preserved fields
      const updatedData = updatedEquipmentList[0]
      const completeEquipment: Equipment = {
        ...editingEquipment, // Preserve id, status, dateAdded, etc.
        ...updatedData,      // Apply the form updates
        lastUpdated: new Date().toISOString() // Update timestamp
      }
      
      const result = await updateEquipmentApi(completeEquipment)
      
      if (result) {
        setEditingEquipment(null)
        await refreshEquipment() // Refresh to get latest data with proper sorting
      }
    } catch (err) {
      console.error("Error updating equipment:", err)
      setError("Failed to update equipment. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handles deleting equipment
  const handleDeleteEquipment = async (id: string, deleteReason: string, deleteNote?: string) => {
    try {
      setIsLoading(true)
      const success = await deleteEquipmentApi(id, deleteReason, deleteNote)
      
      if (success) {
        await refreshEquipment() // Refresh to get latest data
      } else {
        setError("Failed to delete equipment. Please try again.")
      }
    } catch (err) {
      console.error("Error deleting equipment:", err)
      setError("Failed to delete equipment. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handles deleting multiple equipment items
  const handleMultipleDelete = async (ids: string[], deleteReason: string, deleteNote?: string) => {
    try {
      setIsLoading(true)
      const success = await deleteMultipleEquipmentApi(ids, deleteReason, deleteNote)
      
      if (success) {
        setIsMultipleSelect(false)
        setSelectedItems([])
        setMultipleAction(null)
        await refreshEquipment() // Refresh to get latest data
      } else {
        setError("Failed to delete equipment. Please try again.")
      }
    } catch (err) {
      console.error("Error deleting multiple equipment:", err)
      setError("Failed to delete multiple equipment. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handles transferring equipment between locations
  const handleTransferEquipment = async (id: string, roomId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const equipmentToTransfer = equipment.find(item => item.id === id)
      if (!equipmentToTransfer) {
        throw new Error("Equipment not found")
      }
      
      const newRoom = getRoomById(roomId)
      
      if (!newRoom) {
        throw new Error(`Destination room (${roomId}) not found`)
      }
      
      let newStatus = equipmentToTransfer.status
      
      // Update status based on transfer direction
      const currentType = equipmentToTransfer.buildingType;
      if (currentType === "warehouse" && newRoom.buildingType !== "warehouse") {
        if (equipmentToTransfer.status === "stored" || equipmentToTransfer.status === "maintenance") {
          newStatus = "in-use"
        }
      } else if (currentType !== "warehouse" && newRoom.buildingType === "warehouse") {
        if (equipmentToTransfer.status === "in-use") {
          newStatus = "stored"
        } else if (equipmentToTransfer.status === "need-replacement") {
          newStatus = "replaced"
        }
      }
      
      const success = await transferEquipmentApi(
        id, 
        roomId, 
        equipmentToTransfer.roomId, 
        equipmentToTransfer.status, 
        newStatus
      )
      
      if (success) {
        await refreshEquipment() // Refresh to get latest data with proper sorting
      } else {
        setError("Failed to transfer equipment. Please try again.")
      }
    } catch (err) {
      console.error("Error transferring equipment:", err)
      
      if (err instanceof Error) {
        setError(`Failed to transfer equipment: ${err.message}`)
      } else {
        setError("Failed to transfer equipment. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handles transferring multiple equipment items
  const handleMultipleTransfer = async (ids: string[], roomId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const newRoom = getRoomById(roomId)
      if (!newRoom) {
        throw new Error(`Destination room (${roomId}) not found`)
      }
      
      const equipmentWithDetails = ids.map(id => {
        const item = equipment.find(e => e.id === id)
        if (!item) {
          throw new Error(`Equipment with ID ${id} not found`)
        }
        
        let newStatus = item.status
        
        const currentType = item.buildingType
        if (currentType === "warehouse" && newRoom.buildingType !== "warehouse") {
          if (item.status === "stored" || item.status === "maintenance") {
            newStatus = "in-use"
          }
        } else if (currentType !== "warehouse" && newRoom.buildingType === "warehouse") {
          if (item.status === "in-use") {
            newStatus = "stored"
          } else if (item.status === "need-replacement") {
            newStatus = "replaced"
          }
        }
        
        return {
          id: item.id,
          previousRoomId: item.roomId,
          previousStatus: item.status,
          newStatus
        }
      })
      
      const success = await transferMultipleEquipmentApi(equipmentWithDetails, roomId)
      
      if (success) {
        setIsMultipleSelect(false)
        setSelectedItems([])
        setMultipleAction(null)
        await refreshEquipment() // Refresh to get latest data with proper sorting
      } else {
        setError("Failed to transfer equipment. Please try again.")
      }
    } catch (err) {
      console.error("Error transferring multiple equipment:", err)
      
      if (err instanceof Error) {
        setError(`Failed to transfer equipment: ${err.message}`)
      } else {
        setError("Failed to transfer multiple equipment. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handles updating status for multiple equipment items
  const handleMultipleStatusChange = async (ids: string[], newStatus: EquipmentStatus) => {
    try {
      setIsLoading(true)
      const success = await updateMultipleStatusApi(ids, newStatus)
      
      if (success) {
        setIsMultipleSelect(false)
        setSelectedItems([])
        setMultipleAction(null)
        await refreshEquipment() // Refresh to get latest data with proper sorting
      } else {
        setError("Failed to update equipment status. Please try again.")
      }
    } catch (err) {
      console.error("Error updating multiple equipment status:", err)
      setError("Failed to update multiple equipment status. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Toggles multiple selection mode
  const toggleMultipleSelect = (action: "transfer" | "status" | "delete") => {
    setIsMultipleSelect(!isMultipleSelect)
    setSelectedItems([])
    setMultipleAction(action)
  }

  // Cancels multiple selection mode
  const cancelMultipleSelect = () => {
    setIsMultipleSelect(false)
    setSelectedItems([])
    setMultipleAction(null)
  }

  // Filters equipment based on search query, status, and location
  const filteredEquipment = equipment.filter((item) => {
    let matchesSearch = true
    let matchesStatus = true
    let matchesLocation = true

    if (searchQuery) {
      matchesSearch =
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.equipmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    }

    if (statusFilter !== "all") {
      matchesStatus = item.status === statusFilter
    }

    if (activeTab !== "all") {
      matchesLocation = item.buildingType === activeTab
    }

    return matchesSearch && matchesStatus && matchesLocation
  })

  // Render the dashboard UI
  return (
    <div className="container mx-auto py-8 space-y-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <Button 
            className="mt-2" 
            variant="outline" 
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-usf-green"></div>
        </div>
      )}
      
      <div className="bg-usf-green text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">USF Inventory Management</h1>
            <p className="text-usf-lightGold mt-1">Track and manage university equipment by room</p>
          </div>
          <div className="flex gap-2">
            {!isMultipleSelect ? (
              <>
                <Button
                  onClick={() => setIsAddingEquipment(true)}
                  className="bg-usf-gold hover:bg-usf-darkGold text-usf-darkGreen"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Equipment
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => toggleMultipleSelect("transfer")}>
                      <MoveRight className="mr-2 h-4 w-4" />
                      Multiple Transfer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleMultipleSelect("status")}>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Multiple Status Change
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleMultipleSelect("delete")}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Multiple Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeletedItems(true)}>
                      <Archive className="mr-2 h-4 w-4" />
                      View Deleted Items
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="bg-white/10 text-white"
                  onClick={cancelMultipleSelect}
                >
                  <FilterX className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                {multipleAction === "transfer" && (
                  <MultipleTransfer
                    selectedItems={selectedItems}
                    equipment={equipment}
                    onTransfer={handleMultipleTransfer}
                    disabled={selectedItems.length === 0}
                  />
                )}
                {multipleAction === "status" && (
                  <MultipleStatusChange
                    selectedItems={selectedItems}
                    equipment={equipment}
                    onStatusChange={handleMultipleStatusChange}
                    disabled={selectedItems.length === 0}
                  />
                )}
                {multipleAction === "delete" && (
                  <MultipleDelete
                    selectedItems={selectedItems}
                    equipment={equipment}
                    onDelete={handleMultipleDelete}
                    disabled={selectedItems.length === 0}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-usf-green">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Boxes className="mr-2 h-4 w-4 text-usf-green" />
              Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {equipment.filter((item) => item.buildingType === "warehouse").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-usf-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <School className="mr-2 h-4 w-4 text-usf-gold" />
              Classroom
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {equipment.filter((item) => item.buildingType === "classroom").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-usf-lightGreen">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-usf-lightGreen" />
              Office
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {equipment.filter((item) => item.buildingType === "office").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as EquipmentStatus | "all")}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="stored">Stored</SelectItem>
                <SelectItem value="in-use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="need-replacement">Need Replacement</SelectItem>
                <SelectItem value="replaced">Replaced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as BuildingType | "all")}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full md:w-[450px]">
            <TabsTrigger value="all" className="data-[state=active]:bg-usf-green data-[state=active]:text-white px-3">
              All ({equipment.length})
            </TabsTrigger>
            <TabsTrigger
              value="warehouse"
              className="data-[state=active]:bg-usf-green data-[state=active]:text-white px-3"
            >
              Warehouse ({equipment.filter((item) => item.buildingType === "warehouse").length})
            </TabsTrigger>
            <TabsTrigger
              value="classroom"
              className="data-[state=active]:bg-usf-green data-[state=active]:text-white px-3"
            >
              Classroom ({equipment.filter((item) => item.buildingType === "classroom").length})
            </TabsTrigger>
            <TabsTrigger
              value="office"
              className="data-[state=active]:bg-usf-green data-[state=active]:text-white px-3"
            >
              Office ({equipment.filter((item) => item.buildingType === "office").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <EquipmentTable
            equipment={filteredEquipment}
            onEdit={setEditingEquipment}
            onDelete={handleDeleteEquipment}
            onTransfer={handleTransferEquipment}
            isMultipleSelect={isMultipleSelect}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            multipleAction={multipleAction}
          />
        </CardContent>
      </Card>

      {isAddingEquipment && (
        <EquipmentForm
          onSubmit={handleAddEquipment}
          onCancel={() => setIsAddingEquipment(false)}
          title="Add New Equipment"
          existingEquipment={equipment}
          isMultipleAdd
        />
      )}

      {editingEquipment && (
        <EquipmentForm
          equipment={editingEquipment}
          onSubmit={handleUpdateEquipment}
          onCancel={() => setEditingEquipment(null)}
          title="Edit Equipment"
          existingEquipment={equipment}
        />
      )}

      {/* Deleted Items View */}
      <DeletedItemsView
        isOpen={showDeletedItems}
        onClose={() => setShowDeletedItems(false)}
      />
    </div>
  )
}


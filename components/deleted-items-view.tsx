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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Trash2, Clock, FileText } from "lucide-react"
import type { Equipment } from "@/lib/types"
import { getDeletedEquipment, permanentlyDeleteOldEquipment } from "@/lib/api"
import { getEquipmentTypeIcon, getTimeAgo } from "@/lib/utils"

interface DeletedItemsViewProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeletedItemsView({ isOpen, onClose }: DeletedItemsViewProps) {
  const [deletedItems, setDeletedItems] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cleanupStats, setCleanupStats] = useState<{ deletedCount: number; error?: string } | null>(null)

  // Calculate time until permanent deletion for each item
  const calculateTimeUntilDeletion = (lastUpdated: string) => {
    const deletedDate = new Date(lastUpdated)
    const threeDaysLater = new Date(deletedDate.getTime() + (3 * 24 * 60 * 60 * 1000))
    const now = new Date()
    const timeLeft = threeDaysLater.getTime() - now.getTime()
    
    if (timeLeft <= 0) {
      return "Eligible for cleanup"
    }
    
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))
    const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000))
    
    if (daysLeft >= 1) {
      return `${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining`
    } else {
      return `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} remaining`
    }
  }

  // Fetch deleted items
  const fetchDeletedItems = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await getDeletedEquipment()
      setDeletedItems(items)
    } catch (err) {
      console.error("Error fetching deleted items:", err)
      setError("Failed to fetch deleted items")
    } finally {
      setIsLoading(false)
    }
  }

  // Manual cleanup function (for testing/admin purposes)
  const runCleanup = async () => {
    setIsLoading(true)
    try {
      const result = await permanentlyDeleteOldEquipment(3)
      setCleanupStats(result)
      
      if (!result.error && result.deletedCount > 0) {
        // Refresh the list after cleanup
        await fetchDeletedItems()
      }
    } catch (err) {
      console.error("Error running cleanup:", err)
      setError("Failed to run cleanup")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchDeletedItems()
      
      // Set up auto-refresh every 30 seconds when dialog is open
      const interval = setInterval(fetchDeletedItems, 30000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Count items that are eligible for permanent deletion
  const eligibleForCleanup = deletedItems.filter(item => {
    const deletedDate = new Date(item.lastUpdated)
    const threeDaysLater = new Date(deletedDate.getTime() + (3 * 24 * 60 * 60 * 1000))
    return new Date() >= threeDaysLater
  }).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Deleted Items
          </DialogTitle>
          <DialogDescription>
            View and manage soft-deleted equipment items. Items are automatically removed after 3 days.
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Automatic Cleanup Policy
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Deleted items are permanently removed from the database after 3 days. 
                This action cannot be undone. Currently, <strong>{eligibleForCleanup}</strong> items 
                are eligible for permanent deletion.
              </p>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4 text-orange-600" />
                Pending Cleanup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{eligibleForCleanup}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                Total Deleted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{deletedItems.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Cleanup stats */}
        {cleanupStats && (
          <div className={`p-4 rounded-md mb-4 ${cleanupStats.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <p className={`text-sm font-medium ${cleanupStats.error ? 'text-red-800' : 'text-green-800'}`}>
              {cleanupStats.error 
                ? `Cleanup failed: ${cleanupStats.error}`
                : `Cleanup completed: ${cleanupStats.deletedCount} items permanently deleted`
              }
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Delete Reason</TableHead>
                  <TableHead>Delete Note</TableHead>
                  <TableHead>Deleted Date</TableHead>
                  <TableHead>Cleanup Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Trash2 className="h-8 w-8 text-muted-foreground/50" />
                        <p>No deleted items found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedItems.map((item) => {
                    const timeUntilDeletion = calculateTimeUntilDeletion(item.lastUpdated)
                    const isEligible = timeUntilDeletion === "Eligible for cleanup"
                    
                    return (
                      <TableRow key={item.id} className={isEligible ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getEquipmentTypeIcon(item.equipmentType)}</span>
                            {item.model}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{item.equipmentType}</TableCell>
                        <TableCell className="font-mono text-sm">{item.serialNumber}</TableCell>
                        <TableCell>
                          <span className="capitalize px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                            {item.deleteReason?.replace("-", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={item.deleteNote || ""}>
                          {item.deleteNote || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getTimeAgo(item.lastUpdated)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            isEligible 
                              ? "bg-red-100 text-red-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {timeUntilDeletion}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="outline" 
              onClick={runCleanup}
              disabled={isLoading || eligibleForCleanup === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Run Cleanup Now ({eligibleForCleanup} items)
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchDeletedItems} disabled={isLoading}>
                Refresh
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
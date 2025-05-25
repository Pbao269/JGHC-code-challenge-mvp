"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Trash2, Clock, FileText, Download, RefreshCw } from "lucide-react"
import type { Equipment } from "@/lib/types"
import { getDeletedEquipment, hardDeleteAllSoftDeleted } from "@/lib/api"
import { getEquipmentTypeIcon } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface DeletedItemsViewProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeletedItemsView({ isOpen, onClose }: DeletedItemsViewProps) {
  const [deletedItems, setDeletedItems] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cleanupStats, setCleanupStats] = useState<{ deletedCount: number; error?: string } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Calculate time until next Sunday 23:59 deletion
  const calculateTimeUntilDeletion = () => {
    const now = new Date()
    const nextSunday = new Date()
    
    // Find next Sunday at 23:59
    const daysUntilSunday = (7 - now.getDay()) % 7
    if (daysUntilSunday === 0 && now.getHours() >= 23 && now.getMinutes() >= 59) {
      // If it's Sunday after 23:59, next deletion is in 7 days
      nextSunday.setDate(now.getDate() + 7)
    } else if (daysUntilSunday === 0) {
      // If it's Sunday before 23:59, deletion is today
      nextSunday.setDate(now.getDate())
    } else {
      // Otherwise, find the next Sunday
      nextSunday.setDate(now.getDate() + daysUntilSunday)
    }
    
    nextSunday.setHours(23, 59, 0, 0)
    
    const timeLeft = nextSunday.getTime() - now.getTime()
    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000))
    const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    
    if (daysLeft > 0) {
      return `${daysLeft} day${daysLeft > 1 ? 's' : ''} until Sunday cleanup`
    } else if (hoursLeft > 0) {
      return `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} until Sunday cleanup`
    } else {
      return "Cleanup scheduled for today"
    }
  }

  // Fetch deleted items
  const fetchDeletedItems = async () => {
    setIsLoading(true)
    setError(null)
    setCleanupStats(null) // Clear success message on refresh
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
    setShowConfirmDialog(false)
    setIsLoading(true)
    try {
      const result = await hardDeleteAllSoftDeleted()
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

  // Handle dialog close - clear success message
  const handleClose = () => {
    setCleanupStats(null)
    setShowConfirmDialog(false)
    onClose()
  }

  // PDF Export function
  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Add title and header
    doc.setFontSize(20)
    doc.text("USF Inventory - Deleted Items Report", 20, 25)
    
    doc.setFontSize(12)
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, 35)
    doc.text(`Total Deleted Items: ${deletedItems.length}`, 20, 45)
    doc.text(`Next Cleanup: ${calculateTimeUntilDeletion()}`, 20, 55)
    
    // Add cleanup policy information
    doc.setFontSize(10)
    doc.text("Note: Deleted items are automatically removed every Sunday at 23:59", 20, 65)
    
    // Prepare table data
    const tableData = deletedItems.map((item) => {
      const timeUntilDeletion = calculateTimeUntilDeletion()
      
      return [
        item.model,
        item.equipmentType,
        item.serialNumber,
        item.deleteReason?.replace("-", " ") || "N/A",
        item.deleteNote || "—",
        new Date(item.lastUpdated).toLocaleDateString(),
        timeUntilDeletion
      ]
    })
    
    // Add table
    autoTable(doc, {
      head: [['Model', 'Type', 'Serial Number', 'Delete Reason', 'Note', 'Deleted Date', 'Cleanup Status']],
      body: tableData,
      startY: 75,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [46, 125, 50], // USF Green
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Model
        1: { cellWidth: 20 }, // Type
        2: { cellWidth: 25 }, // Serial Number
        3: { cellWidth: 20 }, // Delete Reason
        4: { cellWidth: 30 }, // Note
        5: { cellWidth: 25 }, // Deleted Date
        6: { cellWidth: 30 }, // Cleanup Status
      },
      margin: { left: 20, right: 20 },
    })
    
    // Add footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(
        `Page ${i} of ${pageCount} - USF Inventory Management System`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }
    
    // Save the PDF
    const fileName = `deleted-items-report-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchDeletedItems()
    }
  }, [isOpen])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[99vw] max-w-[1600px] h-[90vh] max-h-[900px] overflow-hidden flex flex-col p-0">
          {/* Header Section - Fixed */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-b bg-white">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                <span>Deleted Items Management</span>
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                View and manage soft-deleted equipment items. Items are automatically removed every Sunday at 23:59.
              </DialogDescription>
            </DialogHeader>

            {/* Action Bar - Responsive */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              {/* Left side - Stats summary */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-lg">{deletedItems.length}</span>
                  <span className="text-muted-foreground">Total Deleted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-lg">{calculateTimeUntilDeletion()}</span>
                </div>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchDeletedItems} 
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                  <span className="sm:hidden">Sync</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportToPDF}
                  disabled={isLoading || deletedItems.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isLoading || deletedItems.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Delete All ({deletedItems.length})</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content Section - Scrollable */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
            {/* Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Automatic Cleanup Schedule
                  </p>
                  <p className="text-sm text-amber-700">
                    Deleted items are permanently removed every Sunday at 23:59 via automated cron job. 
                    This action cannot be undone.
                    <span className="block sm:inline sm:ml-1">
                      Next cleanup: <strong>{calculateTimeUntilDeletion()}</strong>
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Cleanup Stats Alert */}
            {cleanupStats && (
              <div className={`p-4 rounded-lg border ${
                cleanupStats.error 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2">
                  {cleanupStats.error ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-green-600" />
                  )}
                  <p className={`text-sm font-medium ${
                    cleanupStats.error ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {cleanupStats.error 
                      ? `Cleanup failed: ${cleanupStats.error}`
                      : `Cleanup completed successfully: ${cleanupStats.deletedCount} items permanently deleted`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Data Table - Optimized for larger screens */}
            <div className="border rounded-lg bg-white overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading deleted items...</p>
                  </div>
                </div>
              ) : deletedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Trash2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No deleted items</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    All equipment items are currently active. Deleted items will appear here and be automatically cleaned up every Sunday at 23:59.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-[300px] lg:w-[350px]">Equipment</TableHead>
                        <TableHead className="font-semibold w-[140px] hidden sm:table-cell">Type</TableHead>
                        <TableHead className="font-semibold w-[180px]">Serial Number</TableHead>
                        <TableHead className="font-semibold w-[160px] hidden md:table-cell">Delete Reason</TableHead>
                        <TableHead className="font-semibold w-[300px] hidden lg:table-cell">Delete Note</TableHead>
                        <TableHead className="font-semibold w-[140px] hidden md:table-cell">Date Deleted</TableHead>
                        <TableHead className="font-semibold w-[200px]">Cleanup Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedItems.map((item) => {
                        const timeUntilDeletion = calculateTimeUntilDeletion()
                        
                        return (
                          <TableRow 
                            key={item.id} 
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg flex-shrink-0">{getEquipmentTypeIcon(item.equipmentType)}</span>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{item.model}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden capitalize">
                                    {item.equipmentType}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize hidden sm:table-cell">
                              {item.equipmentType}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              <span className="block" title={item.serialNumber}>
                                {item.serialNumber}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {item.deleteReason?.replace("-", " ")}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="block text-sm" title={item.deleteNote || ""}>
                                {item.deleteNote || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm hidden md:table-cell">
                              <span className="block font-medium" title={new Date(item.lastUpdated).toLocaleString()}>
                                {new Date(item.lastUpdated).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-orange-100 text-orange-800">
                                {timeUntilDeletion}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Footer Section - Fixed */}
          <div className="flex-shrink-0 p-4 sm:p-6 border-t bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                <span className="block sm:inline">Manual refresh available via button</span>
                <span className="hidden sm:inline sm:mx-2">•</span>
                <span className="block sm:inline">Last updated: {new Date().toLocaleDateString()}</span>
              </div>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to permanently delete all <strong>{deletedItems.length}</strong> soft-deleted items? 
              This action cannot be undone and will immediately remove all items from the database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={runCleanup}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Boxes, AlertCircle } from "lucide-react"
import type { Equipment, EquipmentStatus } from "@/lib/types"
import { getRoomById } from "@/lib/rooms"
import { getCurrentMonthYear, isSerialNumberDuplicate } from "@/lib/utils"

interface EquipmentFormProps {
  equipment?: Equipment
  onSubmit: (equipment: any) => void
  onCancel: () => void
  title?: string
  existingEquipment?: Equipment[]
  isMultipleAdd?: boolean
}

// Common equipment types
const equipmentTypes = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Printer",
  "Scanner",
  "Projector",
  "Keyboard",
  "Mouse",
  "Tablet",
  "Phone",
  "Server",
  "Router",
  "Switch",
  "Camera",
  "Headphones",
  "Speaker",
  "Microphone",
  "Chair",
  "Desk",
  "Cabinet",
  "Other",
]

export default function EquipmentForm({ equipment, onSubmit, onCancel, title, existingEquipment, isMultipleAdd }: EquipmentFormProps) {
  // For existing equipment editing
  const [formData, setFormData] = useState({
    model: equipment?.model || "",
    equipmentType: equipment?.equipmentType || "",
    serialNumber: equipment?.serialNumber || "",
    dateImported: equipment?.dateImported || getCurrentMonthYear(),
    status: equipment?.status || "stored",
  })

  // For new equipment - multi-step form
  const [step, setStep] = useState(1)
  const [addType, setAddType] = useState<"single" | "multiple">("single")
  const [commonData, setCommonData] = useState({
    model: "",
    equipmentType: "",
    dateImported: getCurrentMonthYear(),
  })
  const [quantity, setQuantity] = useState(2)
  const [serialNumbers, setSerialNumbers] = useState<string[]>(Array(quantity).fill(""))

  const [errors, setErrors] = useState({
    model: "",
    equipmentType: "",
    serialNumber: "",
    dateImported: "",
    quantity: "",
    serialNumbers: [] as string[],
  })

  // Reset form data when switching between single and multiple modes
  useEffect(() => {
    // Reset serial number when switching to single mode
    if (addType === "single") {
      setFormData((prev) => ({
        ...prev,
        serialNumber: "",
      }))
    }
  }, [addType])

  // Get room details for the equipment
  const room = equipment?.roomId ? getRoomById(equipment.roomId) : null
  const isWarehouse = room?.buildingType === "warehouse"

  // Determine available statuses based on location
  const availableStatuses = isWarehouse
    ? (["stored", "maintenance", "replaced"] as EquipmentStatus[])
    : (["in-use", "need-replacement"] as EquipmentStatus[])

  // Handle form data change for editing existing equipment
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Handle common data change for new equipment
  const handleCommonDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCommonData((prev) => ({ ...prev, [name]: value }))

    // Clear error
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Handle serial number change for multiple items
  const handleSerialNumberChange = (index: number, value: string) => {
    const newSerialNumbers = [...serialNumbers]
    newSerialNumbers[index] = value

    // Clear error for this serial number
    const newErrors = [...errors.serialNumbers]
    newErrors[index] = ""

    setSerialNumbers(newSerialNumbers)
    setErrors((prev) => ({ ...prev, serialNumbers: newErrors }))
  }

  // Handle quantity change with input validation
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Only allow numeric input
    if (!/^\d*$/.test(value)) {
      setErrors((prev) => ({ ...prev, quantity: "Please enter a valid number" }))
      return
    }

    const newQuantity = Number.parseInt(value, 10)

    // Clear error
    setErrors((prev) => ({ ...prev, quantity: "" }))

    // If empty, just update the input value but don't adjust arrays
    if (value === "") {
      setQuantity(0)
      return
    }

    // Validate the quantity
    if (newQuantity <= 0) {
      setErrors((prev) => ({ ...prev, quantity: "Quantity must be at least 1" }))
      return
    }

    if (newQuantity > 100) {
      setErrors((prev) => ({ ...prev, quantity: "Quantity cannot exceed 100" }))
      return
    }

    setQuantity(newQuantity)

    // Adjust serial numbers array
    if (newQuantity > serialNumbers.length) {
      // Add empty strings for new items
      setSerialNumbers([...serialNumbers, ...Array(newQuantity - serialNumbers.length).fill("")])
      setErrors((prev) => ({
        ...prev,
        serialNumbers: [...prev.serialNumbers, ...Array(newQuantity - prev.serialNumbers.length).fill("")],
      }))
    } else if (newQuantity < serialNumbers.length) {
      // Remove extra items
      setSerialNumbers(serialNumbers.slice(0, newQuantity))
      setErrors((prev) => ({
        ...prev,
        serialNumbers: prev.serialNumbers.slice(0, newQuantity),
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (equipment) {
      setFormData((prev) => ({ ...prev, [name]: value }))
    } else {
      setCommonData((prev) => ({ ...prev, [name]: value }))
    }

    // Clear error
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Handle direct selection of add type
  const handleAddTypeChange = (type: "single" | "multiple") => {
    setAddType(type)
  }

  // Validate single equipment form
  const validateSingleForm = () => {
    const newErrors = {
      ...errors,
      model: "",
      equipmentType: "",
      serialNumber: "",
      dateImported: "",
    }

    if (!formData.model.trim()) {
      newErrors.model = "Model is required"
    }

    if (!formData.equipmentType.trim()) {
      newErrors.equipmentType = "Equipment type is required"
    }

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = "Serial number is required"
    } else if (isSerialNumberDuplicate(formData.serialNumber, existingEquipment, equipment?.id)) {
      newErrors.serialNumber = "Serial number already exists"
    }

    // Validate date format (MM/YYYY)
    if (!formData.dateImported.trim()) {
      newErrors.dateImported = "Import date is required"
    } else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(formData.dateImported)) {
      newErrors.dateImported = "Date must be in MM/YYYY format"
    }

    setErrors(newErrors)
    return !Object.values({
      model: newErrors.model,
      equipmentType: newErrors.equipmentType,
      serialNumber: newErrors.serialNumber,
      dateImported: newErrors.dateImported,
    }).some((error) => error)
  }

  // Validate common data for multiple items
  const validateCommonData = () => {
    const newErrors = {
      ...errors,
      model: "",
      equipmentType: "",
      dateImported: "",
      quantity: "",
    }

    if (!commonData.model.trim()) {
      newErrors.model = "Model is required"
    }

    if (!commonData.equipmentType.trim()) {
      newErrors.equipmentType = "Equipment type is required"
    }

    // Validate date format (MM/YYYY)
    if (!commonData.dateImported.trim()) {
      newErrors.dateImported = "Import date is required"
    } else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(commonData.dateImported)) {
      newErrors.dateImported = "Date must be in MM/YYYY format"
    }

    // Validate quantity for multiple items
    if (addType === "multiple") {
      if (quantity <= 0) {
        newErrors.quantity = "Quantity must be at least 1"
      }
    }

    setErrors(newErrors)
    return !Object.values({
      model: newErrors.model,
      equipmentType: newErrors.equipmentType,
      dateImported: newErrors.dateImported,
      quantity: addType === "multiple" ? newErrors.quantity : "",
    }).some((error) => error)
  }

  // Validate serial numbers for multiple items
  const validateSerialNumbers = () => {
    const newSerialNumberErrors = serialNumbers.map((sn, index) => {
      if (!sn.trim()) {
        return "Serial number is required"
      }

      // Check for duplicates within the current form
      const isDuplicateInForm = serialNumbers.findIndex((s) => s === sn) !== index
      if (isDuplicateInForm) {
        return "Duplicate serial number"
      }

      // Check for duplicates in existing equipment
      if (isSerialNumberDuplicate(sn, existingEquipment)) {
        return "Serial number already exists"
      }

      return ""
    })

    setErrors((prev) => ({ ...prev, serialNumbers: newSerialNumberErrors }))
    return !newSerialNumberErrors.some((error) => error)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // For editing existing equipment
    if (equipment) {
      if (!validateSingleForm()) {
        return
      }
      // Fix for Edit Action Failure - ensure we're passing the complete updated equipment object
      onSubmit({
        ...equipment,
        ...formData,
        status: formData.status,
      })
      return
    }

    // For adding new equipment - final step
    if (step === 3 && addType === "multiple") {
      if (!validateSerialNumbers()) {
        return
      }

      // Create multiple equipment items
      const newEquipmentItems = serialNumbers.map((serialNumber) => ({
        ...commonData,
        serialNumber,
      }))

      onSubmit(newEquipmentItems)
    } else if (step === 2 && addType === "single") {
      if (!validateCommonData() || !formData.serialNumber) {
        return
      }

      // Check for duplicate serial number
      if (isSerialNumberDuplicate(formData.serialNumber, existingEquipment)) {
        setErrors((prev) => ({ ...prev, serialNumber: "Serial number already exists" }))
        return
      }

      // Create single equipment item
      onSubmit([
        {
          ...commonData,
          serialNumber: formData.serialNumber,
        },
      ])
    }
  }

  // Handle next step
  const handleNextStep = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2 && addType === "multiple") {
      if (validateCommonData()) {
        setStep(3)
        // Initialize serial number errors array
        setErrors((prev) => ({
          ...prev,
          serialNumbers: Array(quantity).fill(""),
        }))
      }
    }
  }

  // Handle back step
  const handleBackStep = () => {
    if (step === 3) {
      setStep(2)
    } else if (step === 2) {
      setStep(1)
    }
  }

  // Render form based on current step
  const renderStepContent = () => {
    // For editing existing equipment
    if (equipment) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model" className="font-medium">
                Model <span className="text-red-500">*</span>
              </Label>
              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g., Dell Elite8, HP LaserJet"
                className="border-usf-green/20 focus-visible:ring-usf-green/30"
              />
              {errors.model && <p className="text-sm text-red-500">{errors.model}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipmentType" className="font-medium">
                Equipment Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.equipmentType}
                onValueChange={(value) => handleSelectChange("equipmentType", value)}
              >
                <SelectTrigger id="equipmentType" className="border-usf-green/20 focus-visible:ring-usf-green/30">
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.equipmentType && <p className="text-sm text-red-500">{errors.equipmentType}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="serialNumber" className="font-medium">
                Serial Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Unique identifier"
                className="border-usf-green/20 focus-visible:ring-usf-green/30 font-mono"
              />
              {errors.serialNumber && <p className="text-sm text-red-500">{errors.serialNumber}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dateImported" className="font-medium">
                Date Imported <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateImported"
                name="dateImported"
                value={formData.dateImported}
                onChange={handleChange}
                placeholder="MM/YYYY"
                className="border-usf-green/20 focus-visible:ring-usf-green/30"
              />
              {errors.dateImported && <p className="text-sm text-red-500">{errors.dateImported}</p>}
            </div>
          </div>

          {/* Status selection for existing equipment */}
          <div className="grid gap-2">
            <Label htmlFor="status" className="font-medium">
              Status
            </Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
              <SelectTrigger id="status" className="border-usf-green/20 focus-visible:ring-usf-green/30">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => {
                  let label = ""
                  let color = ""

                  switch (status) {
                    case "stored":
                      label = "Stored"
                      color = "text-gray-600"
                      break
                    case "maintenance":
                      label = "Maintenance"
                      color = "text-yellow-600"
                      break
                    case "replaced":
                      label = "Replaced"
                      color = "text-red-600"
                      break
                    case "in-use":
                      label = "In Use"
                      color = "text-green-600"
                      break
                    case "need-replacement":
                      label = "Need Replacement"
                      color = "text-red-600"
                      break
                  }

                  return (
                    <SelectItem key={status} value={status} className={color}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }

    // For adding new equipment - step 1: Choose single or multiple
    if (step === 1) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 1: Choose Addition Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Single Item Option */}
            <div
              className={`border rounded-md cursor-pointer transition-colors ${
                addType === "single" ? "border-usf-green bg-usf-green/5" : "border-border hover:bg-muted/50"
              }`}
              onClick={() => handleAddTypeChange("single")}
            >
              <div className="p-4">
                <div className="flex items-start space-x-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary">
                    {addType === "single" && <div className="h-2.5 w-2.5 rounded-full bg-usf-green" />}
                  </div>
                  <div>
                    <p className="font-medium">Single Item</p>
                    <p className="text-sm text-muted-foreground">Add one equipment item</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Multiple Items Option */}
            <div
              className={`border rounded-md cursor-pointer transition-colors ${
                addType === "multiple" ? "border-usf-green bg-usf-green/5" : "border-border hover:bg-muted/50"
              }`}
              onClick={() => handleAddTypeChange("multiple")}
            >
              <div className="p-4">
                <div className="flex items-start space-x-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary">
                    {addType === "multiple" && <div className="h-2.5 w-2.5 rounded-full bg-usf-green" />}
                  </div>
                  <div>
                    <p className="font-medium">Multiple Items</p>
                    <p className="text-sm text-muted-foreground">Add multiple items with the same model and type</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Step 2: Common details
    if (step === 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 2: Enter Equipment Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model" className="font-medium">
                Model <span className="text-red-500">*</span>
              </Label>
              <Input
                id="model"
                name="model"
                value={commonData.model}
                onChange={handleCommonDataChange}
                placeholder="e.g., Dell Elite8, HP LaserJet"
                className="border-usf-green/20 focus-visible:ring-usf-green/30"
              />
              {errors.model && <p className="text-sm text-red-500">{errors.model}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipmentType" className="font-medium">
                Equipment Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={commonData.equipmentType}
                onValueChange={(value) => handleSelectChange("equipmentType", value)}
              >
                <SelectTrigger id="equipmentType" className="border-usf-green/20 focus-visible:ring-usf-green/30">
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.equipmentType && <p className="text-sm text-red-500">{errors.equipmentType}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dateImported" className="font-medium">
                Date Imported <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateImported"
                name="dateImported"
                value={commonData.dateImported}
                onChange={handleCommonDataChange}
                placeholder="MM/YYYY"
                className="border-usf-green/20 focus-visible:ring-usf-green/30"
              />
              {errors.dateImported && <p className="text-sm text-red-500">{errors.dateImported}</p>}
            </div>

            {addType === "single" ? (
              <div className="grid gap-2">
                <Label htmlFor="serialNumber" className="font-medium">
                  Serial Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="Unique identifier"
                  className="border-usf-green/20 focus-visible:ring-usf-green/30 font-mono"
                />
                {errors.serialNumber && <p className="text-sm text-red-500">{errors.serialNumber}</p>}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="quantity" className="font-medium">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="text"
                  inputMode="numeric"
                  value={quantity.toString()}
                  onChange={handleQuantityChange}
                  placeholder="Enter quantity"
                  className="border-usf-green/20 focus-visible:ring-usf-green/30"
                />
                {errors.quantity && (
                  <div className="flex items-center text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>{errors.quantity}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    // Step 3: Serial numbers for multiple items
    if (step === 3) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 3: Enter Serial Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Enter unique serial numbers for each {commonData.model} {commonData.equipmentType}
          </p>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
            {serialNumbers.map((serialNumber, index) => (
              <div key={index} className="grid gap-2">
                <Label htmlFor={`serialNumber-${index}`} className="font-medium">
                  Serial Number {index + 1} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`serialNumber-${index}`}
                  value={serialNumber}
                  onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                  placeholder="Unique identifier"
                  className="border-usf-green/20 focus-visible:ring-usf-green/30 font-mono"
                />
                {errors.serialNumbers[index] && <p className="text-sm text-red-500">{errors.serialNumbers[index]}</p>}
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-usf-green text-xl">{title || "Equipment Form"}</DialogTitle>
          <DialogDescription>
            {equipment
              ? "Update the equipment details. Click save when you're done."
              : "New equipment will be added to the warehouse. Fill in the details and click save."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {renderStepContent()}

          {/* For new equipment, show warehouse notice */}
          {!equipment && (
            <div className="p-3 border rounded-md bg-usf-green/5">
              <div className="flex items-center">
                <Boxes className="mr-2 h-4 w-4 text-usf-green" />
                <span>New equipment will be added to HON Warehouse with "Stored" status</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            {equipment ? (
              <>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-usf-green hover:bg-usf-darkGreen text-white">
                  Save
                </Button>
              </>
            ) : (
              <>
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBackStep}>
                    Back
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                {step < 2 || (step === 2 && addType === "multiple") ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-usf-green hover:bg-usf-darkGreen text-white"
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit" className="bg-usf-green hover:bg-usf-darkGreen text-white">
                    Save
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

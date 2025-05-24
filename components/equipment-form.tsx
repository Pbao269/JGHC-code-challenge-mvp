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
import { getCurrentMonthYear, isSerialNumberDuplicate } from "@/lib/utils"


interface EquipmentFormProps {
  equipment?:       Equipment
  onSubmit: (
    items: Omit<
      Equipment,
      | "id"
      | "status"
      | "dateAdded"
      | "lastUpdated"
      | "roomId"
      | "buildingType"
      | "roomName"
    >[]
  ) => void
  onCancel:         () => void
  title?:           string
  existingEquipment?: Equipment[]
  isMultipleAdd?:   boolean
}


const equipmentTypes = [
  "Laptop", "Desktop", "Monitor", "Printer", "Scanner", "Projector",
  "Keyboard", "Mouse", "Tablet", "Phone", "Server", "Router", "Switch",
  "Camera", "Headphones", "Speaker", "Microphone", "Chair", "Desk",
  "Cabinet", "Other",
]


export default function EquipmentForm({
  equipment,
  onSubmit,
  onCancel,
  title,
  existingEquipment,
}: EquipmentFormProps) {
  const [formData, setFormData] = useState({
    model:         equipment?.model         ?? "",
    equipmentType: equipment?.equipmentType ?? "",
    serialNumber:  equipment?.serialNumber  ?? "",
    dateImported:  equipment?.dateImported  ?? getCurrentMonthYear(),
    status:        equipment?.status        ?? "stored",
  })

  // Multi-add wizard state
  const [step,     setStep]     = useState(1)
  const [addType,  setAddType]  = useState<"single" | "multiple">("single")

  const [commonData, setCommonData] = useState({
    model:        "",
    equipmentType:"",
    dateImported: getCurrentMonthYear(),
  })

  const [quantity,      setQuantity]      = useState(2)
  const [serialNumbers, setSerialNumbers] = useState<string[]>(Array(2).fill(""))

  const [errors, setErrors] = useState({
    model:         "",
    equipmentType: "",
    serialNumber:  "",
    dateImported:  "",
    quantity:      "",
    serialNumbers: [] as string[],
  })

  // Reset serial when switching add-type
  useEffect(() => {
    if (addType === "single") setFormData((p) => ({ ...p, serialNumber: "" }))
  }, [addType])

  // Status list based on location
  const isWarehouse = equipment
    ? equipment.buildingType === "warehouse"
    : true   // all new items begin in the warehouse

  const availableStatuses: EquipmentStatus[] = isWarehouse
    ? ["stored", "maintenance", "replaced"]
    : ["in-use", "need-replacement"]

  // Generic change helpers
  const clearError = (field: keyof typeof errors) =>
    errors[field] && setErrors((e) => ({ ...e, [field]: "" }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
    clearError(name as keyof typeof errors)
  }

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCommonData((p) => ({ ...p, [name]: value }))
    clearError(name as keyof typeof errors)
  }

  const handleSelect = (field: string, value: string) => {
    equipment
      ? setFormData((p) => ({ ...p, [field]: value }))
      : setCommonData((p) => ({ ...p, [field]: value }))
    clearError(field as keyof typeof errors)
  }

  // Serial-number / quantity helpers
  const handleSNChange = (idx: number, value: string) => {
    const sn = [...serialNumbers]; sn[idx] = value
    const er = [...errors.serialNumbers]; er[idx] = ""
    setSerialNumbers(sn)
    setErrors((e) => ({ ...e, serialNumbers: er }))
  }

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (!/^\d*$/.test(v)) {
      setErrors((e) => ({ ...e, quantity: "Please enter a valid number" }))
      return
    }
    const q = Number.parseInt(v || "0", 10)
    setErrors((e) => ({ ...e, quantity: "" }))
    setQuantity(q)

    if (q > serialNumbers.length) {
      setSerialNumbers([...serialNumbers, ...Array(q - serialNumbers.length).fill("")])
      setErrors((e) => ({ ...e, serialNumbers: [...e.serialNumbers, ...Array(q - e.serialNumbers.length).fill("")] }))
    } else {
      setSerialNumbers(serialNumbers.slice(0, q))
      setErrors((e) => ({ ...e, serialNumbers: e.serialNumbers.slice(0, q) }))
    }
  }

  // Validation helpers
  const validateSingle = () => {
    const e = { ...errors, model: "", equipmentType: "", serialNumber: "", dateImported: "" }

    if (!formData.model.trim())          e.model = "Model is required"
    if (!formData.equipmentType.trim())  e.equipmentType = "Equipment type is required"

    if (!formData.serialNumber.trim())   e.serialNumber = "Serial number is required"
    else if (isSerialNumberDuplicate(formData.serialNumber, existingEquipment, equipment?.id))
      e.serialNumber = "Serial number already exists"

    if (!formData.dateImported.trim())             e.dateImported = "Import date is required"
    else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(formData.dateImported))
      e.dateImported = "Date must be in MM/YYYY format"

    setErrors(e)
    return !Object.values({ model: e.model, equipmentType: e.equipmentType, serialNumber: e.serialNumber, dateImported: e.dateImported })
      .some(Boolean)
  }

  const validateCommon = () => {
    const e = { ...errors, model: "", equipmentType: "", dateImported: "", quantity: "" }

    if (!commonData.model.trim())          e.model = "Model is required"
    if (!commonData.equipmentType.trim())  e.equipmentType = "Equipment type is required"

    if (!commonData.dateImported.trim())             e.dateImported = "Import date is required"
    else if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(commonData.dateImported))
      e.dateImported = "Date must be in MM/YYYY format"

    if (addType === "multiple" && quantity <= 0)     e.quantity = "Quantity must be at least 1"

    setErrors(e)
    return !Object.values({ model: e.model, equipmentType: e.equipmentType, dateImported: e.dateImported, quantity: e.quantity }).some(Boolean)
  }

  const validateSNs = () => {
    const se = serialNumbers.map((sn, i) => {
      if (!sn.trim()) return "Serial number is required"
      if (serialNumbers.findIndex((s) => s === sn) !== i) return "Duplicate serial number"
      if (isSerialNumberDuplicate(sn, existingEquipment ?? []))  return "Serial number already exists"
      return ""
    })
    setErrors((e) => ({ ...e, serialNumbers: se }))
    return !se.some(Boolean)
  }

  // Submit
  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()

    // Edit mode
    if (equipment) {
      if (!validateSingle()) return
      onSubmit([{ ...equipment, ...formData, status: formData.status }])
      return
    }

    // Add wizard
    if (step === 3 && addType === "multiple") {
      if (!validateSNs()) return
      onSubmit(serialNumbers.map((sn) => ({ ...commonData, serialNumber: sn })))
      return
    }

    if (step === 2 && addType === "single") {
      if (!validateCommon() || !formData.serialNumber) return
      if (isSerialNumberDuplicate(formData.serialNumber, existingEquipment)) {
        setErrors((e) => ({ ...e, serialNumber: "Serial number already exists" }))
        return
      }
      onSubmit([{ ...commonData, serialNumber: formData.serialNumber }])
    }
  }

  // Wizard navigation
  const nextStep = () => {
    if (step === 1) setStep(2)
    else if (step === 2 && addType === "multiple" && validateCommon()) {
      setStep(3)
      setErrors((e) => ({ ...e, serialNumbers: Array(quantity).fill("") }))
    }
  }

  const prevStep = () => setStep((s) => (s > 1 ? s - 1 : s))

  // UI helpers
  const inputCls = "border-usf-green/20 focus-visible:ring-usf-green/30"

  // JSX: dynamic step content
  const renderStep = () => {
    // Edit existing
    if (equipment) {
      return (
        <div className="space-y-4">
          {/* model + type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model">Model <span className="text-red-500">*</span></Label>
              <Input id="model" name="model" value={formData.model} onChange={handleChange}
                     placeholder="e.g. Dell Elite8" className={inputCls} />
              {errors.model && <p className="text-sm text-red-500">{errors.model}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipmentType">Equipment Type <span className="text-red-500">*</span></Label>
              <Select value={formData.equipmentType}
                      onValueChange={(v) => handleSelect("equipmentType", v)}>
                <SelectTrigger id="equipmentType" className={inputCls}>
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((t) => (
                    <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.equipmentType && <p className="text-sm text-red-500">{errors.equipmentType}</p>}
            </div>
          </div>

          {/* serial + date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="serialNumber">Serial Number <span className="text-red-500">*</span></Label>
              <Input id="serialNumber" name="serialNumber" value={formData.serialNumber}
                     onChange={handleChange} placeholder="Unique identifier"
                     className={`${inputCls} font-mono`} />
              {errors.serialNumber && <p className="text-sm text-red-500">{errors.serialNumber}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dateImported">Date Imported <span className="text-red-500">*</span></Label>
              <Input id="dateImported" name="dateImported" value={formData.dateImported}
                     onChange={handleChange} placeholder="MM/YYYY" className={inputCls} />
              {errors.dateImported && <p className="text-sm text-red-500">{errors.dateImported}</p>}
            </div>
          </div>

          {/* status */}
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v) => handleSelect("status", v)}>
              <SelectTrigger id="status" className={inputCls}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {{
                      "stored": "Stored",
                      "maintenance": "Maintenance",
                      "replaced": "Replaced",
                      "in-use": "In Use",
                      "need-replacement": "Need Replacement",
                    }[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }

    // STEP 1: choose add-type
    if (step === 1) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step&nbsp;1: Choose Addition Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* single */}
            <div
              className={`border rounded-md cursor-pointer transition-colors ${
                addType === "single"
                  ? "border-usf-green bg-usf-green/5"
                  : "border-border hover:bg-muted/50"
              }`}
              onClick={() => setAddType("single")}
            >
              <div className="p-4 space-x-2 flex items-start">
                <div className="h-5 w-5 flex items-center justify-center rounded-full border border-primary">
                  {addType === "single" && <div className="h-2.5 w-2.5 rounded-full bg-usf-green" />}
                </div>
                <div>
                  <p className="font-medium">Single Item</p>
                  <p className="text-sm text-muted-foreground">Add one equipment item</p>
                </div>
              </div>
            </div>

            {/* multiple */}
            <div
              className={`border rounded-md cursor-pointer transition-colors ${
                addType === "multiple"
                  ? "border-usf-green bg-usf-green/5"
                  : "border-border hover:bg-muted/50"
              }`}
              onClick={() => setAddType("multiple")}
            >
              <div className="p-4 space-x-2 flex items-start">
                <div className="h-5 w-5 flex items-center justify-center rounded-full border border-primary">
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
      )
    }

    // STEP 2: common details
    if (step === 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step&nbsp;2: Enter Equipment Details</h3>

          {/* model + type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model">Model <span className="text-red-500">*</span></Label>
              <Input id="model" name="model" value={commonData.model} onChange={handleCommonChange}
                     placeholder="e.g. Dell Elite8" className={inputCls} />
              {errors.model && <p className="text-sm text-red-500">{errors.model}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipmentType">Equipment Type <span className="text-red-500">*</span></Label>
              <Select value={commonData.equipmentType}
                      onValueChange={(v) => handleSelect("equipmentType", v)}>
                <SelectTrigger id="equipmentType" className={inputCls}>
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map((t) => (
                    <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.equipmentType && <p className="text-sm text-red-500">{errors.equipmentType}</p>}
            </div>
          </div>

          {/* date + serial / quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dateImported">Date Imported <span className="text-red-500">*</span></Label>
              <Input id="dateImported" name="dateImported" value={commonData.dateImported}
                     onChange={handleCommonChange} placeholder="MM/YYYY" className={inputCls} />
              {errors.dateImported && <p className="text-sm text-red-500">{errors.dateImported}</p>}
            </div>

            {addType === "single" ? (
              <div className="grid gap-2">
                <Label htmlFor="serialNumber">Serial Number <span className="text-red-500">*</span></Label>
                <Input id="serialNumber" name="serialNumber" value={formData.serialNumber}
                       onChange={handleChange} placeholder="Unique identifier"
                       className={`${inputCls} font-mono`} />
                {errors.serialNumber && <p className="text-sm text-red-500">{errors.serialNumber}</p>}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input id="quantity" type="text" inputMode="numeric"
                       value={quantity.toString()} onChange={handleQtyChange}
                       placeholder="Enter quantity" className={inputCls} />
                {errors.quantity && (
                  <p className="flex items-center text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" /> {errors.quantity}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    // STEP 3: serial numbers list
    if (step === 3) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step&nbsp;3: Enter Serial Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Enter unique serial numbers for each {commonData.model} {commonData.equipmentType}
          </p>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
            {serialNumbers.map((sn, idx) => (
              <div key={idx} className="grid gap-2">
                <Label htmlFor={`sn-${idx}`}>Serial Number {idx + 1} <span className="text-red-500">*</span></Label>
                <Input id={`sn-${idx}`} value={sn}
                       onChange={(e) => handleSNChange(idx, e.target.value)}
                       placeholder="Unique identifier" className={`${inputCls} font-mono`} />
                {errors.serialNumbers[idx] && <p className="text-sm text-red-500">{errors.serialNumbers[idx]}</p>}
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  // Dialog shell
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-usf-green text-xl">
            {title ?? (equipment ? "Edit Equipment" : "Add Equipment")}
          </DialogTitle>
          <DialogDescription>
            {equipment
              ? "Update the equipment details. Click save when you're done."
              : "New equipment will be added to the warehouse. Fill in the details and click save."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {renderStep()}

          {!equipment && (
            <div className="p-3 border rounded-md bg-usf-green/5 flex items-center">
              <Boxes className="mr-2 h-4 w-4 text-usf-green" />
              <span>New equipment will be added to HON Warehouse with &ldquo;Stored&rdquo; status</span>
            </div>
          )}

          <DialogFooter className="pt-4">
            {equipment ? (
              <>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="bg-usf-green hover:bg-usf-darkGreen text-white">Save</Button>
              </>
            ) : (
              <>
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>Back</Button>
                )}
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                {step < 2 || (step === 2 && addType === "multiple") ? (
                  <Button type="button" onClick={nextStep} className="bg-usf-green hover:bg-usf-darkGreen text-white">
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

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { EquipmentStatus, Equipment } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// Could be trimmed as this is only used for frontend testing
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getEquipmentTypeIcon(type: string): string {
  const typeMap: Record<string, string> = {
    laptop: "💻",
    desktop: "🖥️",
    monitor: "🖥️",
    keyboard: "⌨️",
    mouse: "🖱️",
    printer: "🖨️",
    projector: "📽️",
    scanner: "📠",
    server: "🖥️",
    phone: "☎️",
    tablet: "📱",
    camera: "📷",
    headphones: "🎧",
    speaker: "🔊",
    microphone: "🎤",
    router: "📡",
    switch: "🔌",
    cable: "🔌",
    chair: "🪑",
    desk: "🪑",
    cabinet: "🗄️",
    default: "📦",
  }

  return typeMap[type.toLowerCase()] || typeMap.default
}

export function getStatusDetails(status: EquipmentStatus) {
  switch (status) {
    case "stored":
      return { label: "Stored", color: "bg-gray-200 text-gray-800 border-gray-300" }
    case "maintenance":
      return { label: "Maintenance", color: "bg-yellow-100 text-yellow-800 border-yellow-200" }
    case "replaced":
      return { label: "Replaced", color: "bg-red-100 text-red-800 border-red-200" }
    case "in-use":
      return { label: "In Use", color: "bg-green-100 text-green-800 border-green-200" }
    case "need-replacement":
      return { label: "Need Replacement", color: "bg-red-100 text-red-800 border-red-200" }
    default:
      return { label: "Unknown", color: "bg-gray-100 text-gray-800 border-gray-200" }
  }
}
// Format date to show month and year
export function formatImportDate(dateString: string): string {
  const [month, year] = dateString.split("/")
  return `${month}/${year}`
}
// Get current month and year
export function getCurrentMonthYear(): string {
  const date = new Date()
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
}
// Get time ago to see most recent updates (transfers, etc.)
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000)

  // Less than a minute
  if (diffSec < 60) {
    return `${diffSec}s`
  }

  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60)

  // Less than an hour
  if (diffMin < 60) {
    return `${diffMin}m`
  }

  // Convert to hours
  const diffHour = Math.floor(diffMin / 60)

  // Less than a day
  if (diffHour < 24) {
    return `${diffHour}h`
  }

  // Convert to days
  const diffDay = Math.floor(diffHour / 24)

  // Less than a week
  if (diffDay < 7) {
    return `${diffDay}d`
  }

  // Convert to weeks
  const diffWeek = Math.floor(diffDay / 7)

  // Less than a month
  if (diffWeek < 4) {
    return `${diffWeek} week${diffWeek > 1 ? "s" : ""}`
  }

  // Convert to months
  const diffMonth = Math.floor(diffDay / 30)

  // Less than a year
  if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth > 1 ? "s" : ""}`
  }

  // Convert to years
  const diffYear = Math.floor(diffDay / 365)
  return `${diffYear} year${diffYear > 1 ? "s" : ""}`
}

// Check if a serial number already exists in the equipment list
export function isSerialNumberDuplicate(serialNumber: string, equipment: Equipment[], currentId?: string): boolean {
  return equipment.some((item) => item.serialNumber === serialNumber && item.id !== currentId)
}

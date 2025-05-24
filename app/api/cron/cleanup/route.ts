import { NextRequest, NextResponse } from "next/server"
import { permanentlyDeleteOldEquipment } from "@/lib/api"

// This endpoint can be called by a cron service like Vercel Cron or external cron job
export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (optional: add API key check)
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Run the cleanup for items older than 3 days
    const result = await permanentlyDeleteOldEquipment(3)
    
    if (result.error) {
      console.error("Cron cleanup error:", result.error)
      return NextResponse.json(
        { error: result.error, deletedCount: 0 },
        { status: 500 }
      )
    }

    console.log(`Cron cleanup completed: ${result.deletedCount} items permanently deleted`)
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Cron cleanup failed:", error)
    return NextResponse.json(
      { error: "Cleanup failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// Allow GET requests for testing purposes
export async function GET() {
  try {
    const result = await permanentlyDeleteOldEquipment(3)
    
    return NextResponse.json({
      message: "Cleanup test completed",
      deletedCount: result.deletedCount,
      error: result.error,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Cleanup test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
} 
import { NextResponse } from "next/server"
import { db } from "@/lib/supabase"

export async function GET() {
  try {
    const committees = await db.getUniqueCommittees()
    return NextResponse.json({ committees })
  } catch (error) {
    console.error("Error fetching committees:", error)
    return NextResponse.json(
      { error: "Failed to fetch committees" },
      { status: 500 }
    )
  }
}

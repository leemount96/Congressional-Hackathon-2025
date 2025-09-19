"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function UpcomingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the unified hearings page with upcoming filter
    router.replace('/hearings?type=upcoming')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-medium text-muted-foreground">Redirecting...</h2>
      </div>
    </div>
  )
}
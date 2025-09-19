"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar, FileText, Search, Archive, Settings, BookOpen } from "lucide-react"

const navigation = [
  {
    name: "Hearings",
    href: "/hearings",
    icon: Calendar,
    description: "Browse upcoming meetings and historical transcripts",
  },
  {
    name: "Prep Sheets",
    href: "/prep-sheets",
    icon: FileText,
    description: "Create and manage preparation documents",
  },
  {
    name: "GAO Reports",
    href: "/gao-reports",
    icon: BookOpen,
    description: "Browse and analyze Government Accountability Office reports",
  },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center space-x-8">
        <Link href="/hearings" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold text-balance">Congressional Hearings</span>
        </Link>

        <div className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn("flex items-center space-x-2", isActive && "bg-primary text-primary-foreground")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}

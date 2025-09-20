"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Calendar, FileText, Search, Archive, BookOpen } from "lucide-react"

const navigation = [
  {
    name: "Hearings",
    href: "/hearings",
    icon: Calendar,
    description: "Browse upcoming meetings and historical transcripts",
    disabled: false,
  },
  {
    name: "Prep Sheets",
    href: "/prep-sheets",
    icon: FileText,
    description: "Create and manage preparation documents",
    disabled: true,
    comingSoon: true,
  },
  {
    name: "GAO Reports",
    href: "/gao-reports",
    icon: BookOpen,
    description: "Browse and analyze Government Accountability Office reports",
    disabled: true,
    comingSoon: true,
  },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <TooltipProvider>
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

              if (item.disabled && item.comingSoon) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className={cn(
                          "flex items-center space-x-2 cursor-not-allowed opacity-50",
                          "hover:bg-transparent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

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
      </nav>
    </TooltipProvider>
  )
}

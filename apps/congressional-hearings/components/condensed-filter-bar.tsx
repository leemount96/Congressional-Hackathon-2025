"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Search, 
  SlidersHorizontal, 
  X,
  Building,
  Calendar,
  ChevronDown,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CondensedFilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedCommittee: string
  onCommitteeChange: (value: string) => void
  committees: string[]
  selectedChamber: string
  onChamberChange: (value: string) => void
  dateRange: string
  onDateRangeChange: (value: string) => void
  selectedType: 'all' | 'upcoming' | 'historical'
  onTypeChange: (value: 'all' | 'upcoming' | 'historical') => void
  totalCount: number
  currentCount: number
  className?: string
}

export function CondensedFilterBar({
  searchTerm,
  onSearchChange,
  selectedCommittee,
  onCommitteeChange,
  committees,
  selectedChamber,
  onChamberChange,
  dateRange,
  onDateRangeChange,
  selectedType,
  onTypeChange,
  totalCount,
  currentCount,
  className
}: CondensedFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Calculate active filters count
  const activeFiltersCount = [
    selectedCommittee !== "All Committees",
    selectedChamber !== "all",
    dateRange !== "all",
    searchTerm !== ""
  ].filter(Boolean).length

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearchTerm, onSearchChange])

  const handleClearAll = () => {
    setLocalSearchTerm("")
    onSearchChange("")
    onCommitteeChange("All Committees")
    onChamberChange("all")
    onDateRangeChange("all")
  }

  const hasActiveFilters = activeFiltersCount > 0

  return (
    <div className={cn("bg-muted/30 rounded-lg border", className)}>
      {/* Compact Header Bar */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Type Toggle */}
          <div className="flex items-center rounded-lg border bg-background p-1">
            <Button
              variant={selectedType === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTypeChange('all')}
              className="h-7 px-3 text-xs"
            >
              All Hearings
            </Button>
            <Button
              variant={selectedType === 'upcoming' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTypeChange('upcoming')}
              className="h-7 px-3 text-xs"
            >
              Upcoming Only
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hearings..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            {/* Committee Selector */}
            <Select value={selectedCommittee} onValueChange={onCommitteeChange}>
              <SelectTrigger className="h-9 w-[180px]">
                <Building className="mr-2 h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Committee" />
              </SelectTrigger>
              <SelectContent>
                {committees.map((committee) => (
                  <SelectItem key={committee} value={committee}>
                    {committee.length > 40 ? committee.substring(0, 40) + "..." : committee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Chamber Selector */}
            <Select value={selectedChamber} onValueChange={onChamberChange}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Chamber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chambers</SelectItem>
                <SelectItem value="House">House</SelectItem>
                <SelectItem value="Senate">Senate</SelectItem>
                <SelectItem value="Joint">Joint</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger className="h-9 w-[140px]">
                <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last year</SelectItem>
                <SelectItem value="24">Last 2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <>
                <Badge variant="secondary" className="h-7 px-2">
                  <Filter className="mr-1 h-3 w-3" />
                  {activeFiltersCount} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs hover:text-destructive"
                >
                  Clear All
                </Button>
              </>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground ml-auto">
            {currentCount} of {totalCount} results
          </div>
        </div>
      </div>

      {/* Expandable Active Filters Section */}
      {hasActiveFilters && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 pb-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal className="h-3 w-3" />
                Active Filters
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="outline" className="gap-1">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setLocalSearchTerm("")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCommittee !== "All Committees" && (
                <Badge variant="outline" className="gap-1">
                  <Building className="h-3 w-3 mr-1" />
                  {selectedCommittee.length > 30 
                    ? selectedCommittee.substring(0, 30) + "..." 
                    : selectedCommittee}
                  <button
                    onClick={() => onCommitteeChange("All Committees")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedChamber !== "all" && (
                <Badge variant="outline" className="gap-1">
                  Chamber: {selectedChamber}
                  <button
                    onClick={() => onChamberChange("all")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateRange !== "all" && (
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateRange === "3" && "Last 3 months"}
                  {dateRange === "6" && "Last 6 months"}
                  {dateRange === "12" && "Last year"}
                  {dateRange === "24" && "Last 2 years"}
                  <button
                    onClick={() => onDateRangeChange("all")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

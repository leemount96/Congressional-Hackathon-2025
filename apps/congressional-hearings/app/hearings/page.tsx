"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Archive, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import { CondensedFilterBar } from "@/components/condensed-filter-bar"

interface Hearing {
  id: number
  event_id?: string
  chamber?: string
  congress?: number
  event_date: string
  title: string
  committee_name: string
  committee_system_code?: string
  location_building?: string
  location_room?: string
  meeting_type?: string
  meeting_status?: string
  api_url?: string
  type: 'upcoming' | 'historical'
  has_transcript?: boolean
  pages?: number
  word_count?: number
  content_source?: string
}

const ITEMS_PER_PAGE = 15

export default function UnifiedHearingsPage() {
  const router = useRouter()
  const [hearings, setHearings] = useState<Hearing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedChamber, setSelectedChamber] = useState("all")
  const [selectedType, setSelectedType] = useState<'all' | 'upcoming' | 'historical'>("all")
  const [dateRange, setDateRange] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalUpcoming, setTotalUpcoming] = useState(0)
  const [totalHistorical, setTotalHistorical] = useState(0)
  const [committees, setCommittees] = useState<string[]>(["All Committees"])
  const [selectedCommittee, setSelectedCommittee] = useState("All Committees")

  useEffect(() => {
    fetchHearings()
  }, [selectedChamber, selectedType])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedChamber, selectedType, dateRange, selectedCommittee])

  const fetchHearings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedChamber !== "all") {
        params.append("chamber", selectedChamber)
      }
      params.append("type", selectedType)
      params.append("limit", "500")  // Fetch more results for client-side filtering
      params.append("offset", "0")

      const response = await fetch(`/api/hearings/unified?${params.toString()}`)
      const data = await response.json()
      
      setHearings(data.hearings || [])
      setTotalCount(data.pagination?.total || 0)
      setTotalUpcoming(data.pagination?.totalUpcoming || 0)
      setTotalHistorical(data.pagination?.totalHistorical || 0)

      // Extract unique committees from ALL hearings
      const uniqueCommittees = new Set<string>()
      data.hearings?.forEach((hearing: Hearing) => {
        if (hearing.committee_name && hearing.committee_name !== "Committee information not available") {
          uniqueCommittees.add(hearing.committee_name)
        }
      })
      const sortedCommittees = Array.from(uniqueCommittees).sort()
      if (sortedCommittees.length > 0) {
        setCommittees(["All Committees", ...sortedCommittees])
      }
    } catch (error) {
      console.error("Error fetching hearings:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredHearings = hearings.filter((hearing) => {
    const matchesSearch = !searchTerm ||
      hearing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hearing.committee_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCommittee = selectedCommittee === "All Committees" || 
      hearing.committee_name === selectedCommittee

    let matchesDate = true
    if (dateRange !== "all") {
      const hearingDate = new Date(hearing.event_date)
      const now = new Date()
      const monthsAgo = Number.parseInt(dateRange)
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate())
      matchesDate = hearingDate >= cutoffDate
    }

    return matchesSearch && matchesCommittee && matchesDate
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredHearings.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentHearings = filteredHearings.slice(startIndex, endIndex)

  const getPageNumbers = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []
    let l

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i)
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      l = i
    })

    return rangeWithDots
  }

  const getStatusColor = (status: string, type: 'upcoming' | 'historical') => {
    if (type === 'historical') return "default"
    
    switch (status?.toLowerCase()) {
      case "scheduled":
        return "secondary"
      case "postponed":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const handleRowClick = (hearing: Hearing) => {
    if (hearing.type === 'historical') {
      router.push(`/historical/${hearing.id}/transcript`)
    } else {
      router.push(`/prep-sheets/${hearing.event_id}`)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Date TBD"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }


  return (
    <div className="space-y-6">


      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Type Tabs */}
            <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Hearings</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Only</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter Controls */}
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Search hearings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Committee</label>
                <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {committees.map((committee) => (
                      <SelectItem key={committee} value={committee}>
                        {committee.length > 40 ? committee.substring(0, 40) + "..." : committee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Chamber</label>
                <Select value={selectedChamber} onValueChange={setSelectedChamber}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chambers</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    <SelectItem value="Senate">Senate</SelectItem>
                    <SelectItem value="Joint">Joint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedCommittee("All Committees")
                    setSelectedChamber("all")
                    setSelectedType("all")
                    setDateRange("all")
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Results count */}
            {!loading && (
              <div className="text-sm text-muted-foreground">
                {filteredHearings.length === 0 
                  ? "No results found" 
                  : `${filteredHearings.length} result${filteredHearings.length !== 1 ? 's' : ''} found`}
                {filteredHearings.length > ITEMS_PER_PAGE && 
                  ` • Showing ${startIndex + 1}-${Math.min(endIndex, filteredHearings.length)} of ${filteredHearings.length}`}
                {filteredHearings.length >= 500 && 
                  ` (limited view)`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 mb-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredHearings.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hearings found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Committee</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentHearings.map((hearing) => (
                    <TableRow 
                      key={`${hearing.type}-${hearing.id}`} 
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(hearing)}
                    >
                      <TableCell className="font-medium">
                        {formatDate(hearing.event_date)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[400px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-medium text-sm truncate">
                                {hearing.title}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              align="start"
                              className="max-w-[500px] text-wrap"
                              onPointerDownOutside={(e) => e.preventDefault()}
                            >
                              {hearing.title}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm text-muted-foreground truncate">
                                {hearing.committee_name}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top"
                              align="start"
                              className="max-w-[400px] text-wrap"
                              onPointerDownOutside={(e) => e.preventDefault()}
                            >
                              {hearing.committee_name}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={hearing.type === 'historical' ? "default" : "secondary"} className="text-xs">
                          {hearing.type === 'historical' ? 'Transcript' : 'Upcoming'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hearing.type === 'upcoming' ? (
                          <Badge 
                            variant={getStatusColor(hearing.meeting_status || 'scheduled', hearing.type) as any}
                            className="text-xs"
                          >
                            {hearing.meeting_status || 'Scheduled'}
                          </Badge>
                        ) : hearing.pages ? (
                          <span className="text-sm text-muted-foreground">
                            {hearing.pages} pages
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {getPageNumbers().map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="px-3 py-1">...</span>
                        ) : (
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page as number)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
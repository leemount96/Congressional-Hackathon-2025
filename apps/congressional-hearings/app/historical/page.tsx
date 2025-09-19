"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Calendar, 
  FileText, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { db, transformMarkdownHearingForDisplay, type CongressionalHearingMarkdown } from "@/lib/supabase"

const ITEMS_PER_PAGE = 10

export default function HistoricalHearings() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCommittee, setSelectedCommittee] = useState("All Committees")
  const [selectedTopic, setSelectedTopic] = useState("All Topics")
  const [dateRange, setDateRange] = useState("all")
  const [hearings, setHearings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [committees, setCommittees] = useState<string[]>(["All Committees"])
  const [topics, setTopics] = useState<string[]>(["All Topics"])
  const [currentPage, setCurrentPage] = useState(1)

  // Load hearings from database
  useEffect(() => {
    async function loadHearings() {
      try {
        setLoading(true)
        setError(null)
        const markdownHearings = await db.getAllMarkdownHearings()
        const transformedHearings = markdownHearings.map(transformMarkdownHearingForDisplay)
        setHearings(transformedHearings)
        
        // Extract unique committees from the hearings data
        const uniqueCommittees = new Set<string>()
        const uniqueTopics = new Set<string>()
        
        transformedHearings.forEach(hearing => {
          if (hearing.committee) {
            uniqueCommittees.add(hearing.committee)
          }
          if (hearing.topics && Array.isArray(hearing.topics)) {
            hearing.topics.forEach((topic: string) => {
              // Filter out placeholder topics
              if (topic && topic !== "Topics to be extracted from content") {
                uniqueTopics.add(topic)
              }
            })
          }
        })
        
        // Sort and set committees
        const sortedCommittees = Array.from(uniqueCommittees).sort()
        setCommittees(["All Committees", ...sortedCommittees])
        
        // Sort and set topics (only if we have real topics)
        const sortedTopics = Array.from(uniqueTopics).sort()
        if (sortedTopics.length > 0) {
          setTopics(["All Topics", ...sortedTopics])
        }
      } catch (err) {
        console.error('Error loading hearings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load hearings')
      } finally {
        setLoading(false)
      }
    }
    loadHearings()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCommittee, selectedTopic, dateRange])

  const filteredHearings = hearings.filter((hearing) => {
    const matchesSearch =
      hearing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hearing.committee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hearing.witnesses.some((witness) => witness.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCommittee = selectedCommittee === "All Committees" || hearing.committee === selectedCommittee
    const matchesTopic = selectedTopic === "All Topics" || hearing.topics.some((topic) => topic === selectedTopic)

    let matchesDate = true
    if (dateRange !== "all") {
      const hearingDate = new Date(hearing.date)
      const now = new Date()
      const monthsAgo = Number.parseInt(dateRange)
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate())
      matchesDate = hearingDate >= cutoffDate
    }

    return matchesSearch && matchesCommittee && matchesTopic && matchesDate
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Historical Hearings</h1>
          <p className="text-muted-foreground mt-2">Browse and analyze past committee hearings and transcripts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Advanced Search
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading hearings: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search hearings, witnesses..."
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
                      {committee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Topic</label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
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
                  setSelectedTopic("All Topics")
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
            <div className="mt-4 text-sm text-muted-foreground">
              {filteredHearings.length === 0 
                ? "No results found" 
                : `${filteredHearings.length} result${filteredHearings.length !== 1 ? 's' : ''} found`}
              {filteredHearings.length > ITEMS_PER_PAGE && 
                ` • Showing ${startIndex + 1}-${Math.min(endIndex, filteredHearings.length)} of ${filteredHearings.length}`}
            </div>
          )}
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
                    <TableHead className="text-center">Pages</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentHearings.map((hearing) => (
                    <TableRow 
                      key={hearing.id} 
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/historical/${hearing.id}/transcript`)}
                    >
                      <TableCell className="font-medium">
                        {new Date(hearing.date).toLocaleDateString('en-US', { 
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
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
                                {hearing.committee}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top"
                              align="start"
                              className="max-w-[400px] text-wrap"
                              onPointerDownOutside={(e) => e.preventDefault()}
                            >
                              {hearing.committee}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {hearing.pages}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={hearing.transcriptStatus === "available" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {hearing.transcriptStatus}
                        </Badge>
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
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { 
  Calendar, 
  FileText, 
  ArrowLeft, 
  Download, 
  Share2, 
  Info,
  Building,
  Menu,
  Eye,
  Copy,
  ChevronRight,
  Sparkles,
  BarChart3,
  Clock,
  Users,
  MessageSquare,
  ExternalLink,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { db, type CongressionalHearingMarkdown } from "@/lib/supabase"
import { EnhancedTranscriptViewer } from "@/components/enhanced-transcript-viewer"
import { EnhancedFilterPanel } from "@/components/enhanced-filter-panel"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export default function EnhancedTranscriptPage({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [hearing, setHearing] = useState<CongressionalHearingMarkdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllSpeakers, setShowAllSpeakers] = useState(true)
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"transcript" | "summary" | "citations">("transcript")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load hearing data
  useEffect(() => {
    async function loadHearing() {
      try {
        setLoading(true)
        setError(null)
        const hearingData = await db.getMarkdownHearingById(parseInt(params.id))
        setHearing(hearingData)
      } catch (err) {
        console.error('Error loading hearing:', err)
        setError(err instanceof Error ? err.message : 'Failed to load hearing')
      } finally {
        setLoading(false)
      }
    }
    loadHearing()
  }, [params.id])

  // Parse transcript segments
  const segments = useMemo(() => {
    if (!hearing?.markdown_content || hearing.content_source !== 'labeled_transcript') return []

    const lines = hearing.markdown_content.split('\n')
    const parsed: any[] = []

    for (const line of lines) {
      const match = line.match(/\[(\d{2}:\d{2}:\d{2}) - (\d{2}:\d{2}:\d{2})\] ([^(]+) \(([^)]+)\): (.*)/)
      if (match) {
        parsed.push({
          timestamp: `${match[1]} - ${match[2]}`,
          speaker: match[3].trim(),
          role: match[4].trim(),
          text: match[5].trim()
        })
      }
    }
    return parsed
  }, [hearing?.markdown_content, hearing?.content_source])

  const handleSpeakerFilterChange = (showAll: boolean, speaker: string | null) => {
    setShowAllSpeakers(showAll)
    setSelectedSpeaker(speaker)
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleTimestampClick = (timestamp: string) => {
    // Could implement video playback integration here
    console.log('Timestamp clicked:', timestamp)
  }

  // Helper function to detect markdown content
  const isMarkdownContent = (content: string) => {
    if (!content) return false
    const markdownPatterns = [/^#+\s/, /\*\*.*\*\*/, /^\*\s/, /^\d+\.\s/, /^\>\s/, /```/, /\[.*\]\(.*\)/, /^\|.*\|/, /^---+$/]
    const lines = content.split('\n').slice(0, 20)
    let markdownScore = 0
    for (const line of lines) {
      for (const pattern of markdownPatterns) {
        if (pattern.test(line.trim())) {
          markdownScore++
          break
        }
      }
    }
    return markdownScore > lines.length * 0.2
  }

  // Calculate statistics
  const stats = useMemo(() => {
    if (!segments.length) return null
    
    const speakerMap = new Map()
    let totalWords = 0
    
    segments.forEach(seg => {
      const words = seg.text.split(' ').length
      totalWords += words
      
      const existing = speakerMap.get(seg.speaker)
      if (existing) {
        existing.count++
        existing.words += words
      } else {
        speakerMap.set(seg.speaker, {
          name: seg.speaker,
          role: seg.role,
          count: 1,
          words
        })
      }
    })
    
    return {
      totalSegments: segments.length,
      totalWords,
      totalSpeakers: speakerMap.size,
      speakers: Array.from(speakerMap.values()).sort((a, b) => b.count - a.count)
    }
  }, [segments])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !hearing) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading hearing</AlertTitle>
          <AlertDescription>
            {error || "Hearing not found. It may not have been converted to markdown yet."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/historical">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold line-clamp-1">{hearing.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {hearing.committee || "Committee"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(hearing.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download transcript</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      {copied ? <Copy className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                      <span className="hidden sm:inline ml-2">{copied ? "Copied!" : "Share"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? "Link copied!" : "Copy link to share"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Mobile menu trigger */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="p-6 pb-3">
                    <SheetTitle>Filters & Analytics</SheetTitle>
                  </SheetHeader>
                  <div className="h-full pb-20">
                    {hearing?.content_source === 'labeled_transcript' && (
                      <EnhancedFilterPanel
                        segments={segments}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        showAllSpeakers={showAllSpeakers}
                        selectedSpeaker={selectedSpeaker}
                        onSpeakerFilterChange={handleSpeakerFilterChange}
                        showStats={true}
                      />
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Mobile title */}
          <div className="md:hidden mt-3">
            <h1 className="text-lg font-bold line-clamp-2">{hearing.title}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Info Alert */}
        {hearing.content_source && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Data Source</AlertTitle>
            <AlertDescription>
              This transcript is sourced from {hearing.content_source.replace('_', ' ')} 
              {hearing.word_count && ` • ${hearing.word_count.toLocaleString()} words`}
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Speakers</CardTitle>
                  </div>
                  <span className="text-2xl font-bold">{stats.totalSpeakers}</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Statements</CardTitle>
                  </div>
                  <span className="text-2xl font-bold">{stats.totalSegments}</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Words</CardTitle>
                  </div>
                  <span className="text-2xl font-bold">{(stats.totalWords / 1000).toFixed(1)}k</span>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Est. Time</CardTitle>
                  </div>
                  <span className="text-2xl font-bold">{Math.round(stats.totalWords / 200)}m</span>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block">
            <Card className="sticky top-24 h-[calc(100vh-7rem)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filters & Analytics</CardTitle>
              </CardHeader>
              <CardContent className="p-3 h-[calc(100%-4rem)]">
                {hearing?.content_source === 'labeled_transcript' ? (
                  <EnhancedFilterPanel
                    segments={segments}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    showAllSpeakers={showAllSpeakers}
                    selectedSpeaker={selectedSpeaker}
                    onSpeakerFilterChange={handleSpeakerFilterChange}
                    showStats={true}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Advanced filtering is available for labeled transcripts only
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-15rem)]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Transcript
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {hearing.content_source?.replace('_', ' ')}
                    </Badge>
                    {hearing.ai_summary_generated && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Enhanced
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* View Tabs */}
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="mt-3">
                  <TabsList className="grid w-fit grid-cols-3">
                    <TabsTrigger value="transcript" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Transcript
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="text-xs" disabled={!hearing.ai_summary}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="citations" className="text-xs" disabled>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Citations
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  {activeView === "transcript" && (
                    <div className="p-6">
                      {hearing.content_source === 'labeled_transcript' ? (
                        <EnhancedTranscriptViewer
                          content={hearing.markdown_content || ""}
                          searchTerm={searchTerm}
                          showAllSpeakers={showAllSpeakers}
                          selectedSpeaker={selectedSpeaker}
                          onTimestampClick={handleTimestampClick}
                          showLineNumbers={false}
                          enableCitation={true}
                        />
                      ) : isMarkdownContent(hearing.markdown_content || "") ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {hearing.markdown_content || "No transcript content available"}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {hearing.markdown_content || "No transcript content available"}
                        </pre>
                      )}
                    </div>
                  )}
                  
                  {activeView === "summary" && hearing.ai_summary && (
                    <div className="p-6">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {hearing.ai_summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  
                  {activeView === "citations" && (
                    <div className="p-6">
                      <div className="text-center py-12">
                        <ExternalLink className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">Citation analysis coming soon</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

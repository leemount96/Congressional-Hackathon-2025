"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { 
  Calendar, 
  Users, 
  FileText, 
  ArrowLeft, 
  Download, 
  Share2, 
  Info,
  Building,
  Menu,
  Clock,
  MessageSquare,
  AlertCircle,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { db, type CongressionalHearingMarkdown } from "@/lib/supabase"
import { EnhancedTranscriptViewer } from "@/components/enhanced-transcript-viewer"
import { EnhancedFilterPanel } from "@/components/enhanced-filter-panel"
import { cn } from "@/lib/utils"

export default function TranscriptViewV2({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [hearing, setHearing] = useState<CongressionalHearingMarkdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllSpeakers, setShowAllSpeakers] = useState(true)
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load hearing data from database
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

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text
    const regex = new RegExp(`(${term})`, "gi")
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900/50">$1</mark>')
  }

  // Helper function to detect if content is markdown
  const isMarkdownContent = (content: string) => {
    if (!content) return false
    const markdownPatterns = [
      /^#+\s/, /\*\*.*\*\*/, /^\*\s/, /^\d+\.\s/, /^\>\s/, /```/, /\[.*\]\(.*\)/, /^\|.*\|/, /^---+$/
    ]
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

  // Parse labeled transcript into segments
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/historical">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Historical Hearings
            </Link>
          </Button>
          <div>
            <Skeleton className="h-8 w-96 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
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
      {/* Enhanced Header */}
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
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Download</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{copied ? "Copied!" : "Share"}</span>
              </Button>
              
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
        {segments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Speakers</CardTitle>
                  </div>
                  <span className="text-2xl font-bold">
                    {Array.from(new Set(segments.map(s => s.speaker))).length}
                  </span>
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
                  <span className="text-2xl font-bold">{segments.length}</span>
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
                  <span className="text-2xl font-bold">
                    {hearing.word_count ? (hearing.word_count / 1000).toFixed(1) + 'k' : '0'}
                  </span>
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
                  <span className="text-2xl font-bold">
                    {Math.round((hearing.word_count || 0) / 200)}m
                  </span>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Enhanced Filter Panel - Desktop */}
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

          {/* Enhanced Transcript Viewer */}
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
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <div className="p-6">
                    {hearing.content_source === 'labeled_transcript' ? (
                      <EnhancedTranscriptViewer
                        content={hearing.markdown_content || ""}
                        searchTerm={searchTerm}
                        showAllSpeakers={showAllSpeakers}
                        selectedSpeaker={selectedSpeaker}
                        showLineNumbers={false}
                        enableCitation={true}
                      />
                    ) : isMarkdownContent(hearing.markdown_content || "") ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Custom styling for markdown elements
                            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-primary border-b border-border pb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-primary">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                            p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground bg-muted/30 py-2">
                                {children}
                              </blockquote>
                            ),
                            code: ({ children }) => (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4">
                                {children}
                              </pre>
                            ),
                            table: ({ children }) => (
                              <table className="w-full border-collapse border border-border mb-4">
                                {children}
                              </table>
                            ),
                            th: ({ children }) => (
                              <th className="border border-border bg-muted px-3 py-2 text-left font-medium">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-border px-3 py-2">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {hearing.markdown_content || "No transcript content available"}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      // Plain text content
                      <div
                        className="prose prose-sm max-w-none whitespace-pre-line font-mono text-sm"
                        dangerouslySetInnerHTML={{
                          __html: highlightSearchTerm(hearing.markdown_content || "No transcript content available", searchTerm),
                        }}
                      />
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Users, FileText, ExternalLink, ArrowLeft, Download, Quote, LinkIcon, Info, AlertCircle } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { db, type CongressionalHearingMarkdown } from "@/lib/supabase"

// This will be populated from the database
const mockTranscriptData = {
  citations: [], // Placeholder for future citation extraction
}

export default function TranscriptView({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCitation, setSelectedCitation] = useState<number | null>(null)
  const [hearing, setHearing] = useState<CongressionalHearingMarkdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  const filteredCitations = mockTranscriptData.citations.filter(
    (citation: any) =>
      citation.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      citation.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      citation.speaker.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="space-y-6">
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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/historical">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Historical Hearings
            </Link>
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading hearing: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!hearing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/historical">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Historical Hearings
            </Link>
          </Button>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Hearing not found. It may not have been converted to markdown yet.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/historical">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Historical Hearings
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-balance">{hearing.title}</h1>
          <p className="text-muted-foreground mt-2">Transcript and Citation Analysis</p>
        </div>
      </div>

      {/* Data source info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Showing real hearing content from your database. Citations and detailed analysis features are placeholders and will be enhanced in future updates.
        </AlertDescription>
      </Alert>

      {/* Header Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{hearing.committee || "Committee information not available"}</CardTitle>
              <CardDescription className="mt-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(hearing.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {hearing.word_count?.toLocaleString() || 0} words
                  </div>
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    0 citations (placeholder)
                  </div>
                </div>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm">
                <LinkIcon className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="text-sm font-medium mb-2">Witnesses:</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Users className="mr-1 h-3 w-3" />
                Witnesses to be extracted (placeholder)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Citations Panel */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Quote className="h-5 w-5" />
                Citations & References
              </CardTitle>
              <CardDescription>Documents and sources referenced in the hearing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search citations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />

                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg border-dashed">
                      <div className="text-center space-y-2">
                        <Quote className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Citation extraction coming soon
                        </p>
                        <p className="text-xs text-muted-foreground">
                          We'll automatically identify and link citations from the full transcript content
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Feature in development
                        </Badge>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transcript */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Full Transcript
              </CardTitle>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search transcript..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Badge variant="outline">{hearing.word_count?.toLocaleString() || 0} words</Badge>
                <Badge variant="outline">Source: {hearing.content_source}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="prose prose-sm max-w-none markdown-content">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Custom styling for markdown elements
                      h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-primary">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-primary">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
                      p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground">
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
                    }}
                  >
                    {hearing.markdown_content || "No transcript content available"}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

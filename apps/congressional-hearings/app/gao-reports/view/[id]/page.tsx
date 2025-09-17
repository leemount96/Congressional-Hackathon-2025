"use client"

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, FileText, Calendar, User } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'

interface GAOReportData {
  id: string;
  title: string;
  date: string;
  content: string;
  metadata?: {
    Author?: string;
    CreationDate?: string;
    Creator?: string;
    ModDate?: string;
    Producer?: string;
    SourceModified?: string;
    Title?: string;
  };
}

export default function GAOReportViewPage() {
  const params = useParams()
  const reportId = params.id as string
  const [reportData, setReportData] = useState<GAOReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/gao-reports/${reportId}`)
        
        if (!response.ok) {
          throw new Error('Report not found')
        }
        
        const data = await response.json()
        setReportData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    if (reportId) {
      fetchReport()
    }
  }, [reportId])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading report...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || 'The requested GAO report could not be found.'}
            </p>
            <Button asChild>
              <Link href="/gao-reports">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to GAO Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/gao-reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{reportData.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(reportData.date).toLocaleDateString()}
              </span>
              <Badge variant="secondary">{reportData.id}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/gao_reports/${reportData.id.toLowerCase()}.md`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download Raw MD
            </a>
          </Button>
        </div>
      </div>

      {/* Metadata */}
      {reportData.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {reportData.metadata.Author && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Author:</span>
                  <span>{reportData.metadata.Author}</span>
                </div>
              )}
              {reportData.metadata.CreationDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Created:</span>
                  <span>{new Date(reportData.metadata.CreationDate).toLocaleDateString()}</span>
                </div>
              )}
              {reportData.metadata.Creator && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Creator:</span>
                  <span>{reportData.metadata.Creator}</span>
                </div>
              )}
              {reportData.metadata.Producer && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Producer:</span>
                  <span>{reportData.metadata.Producer}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
          <CardDescription>
            Full text of the GAO report with markdown formatting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{reportData.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

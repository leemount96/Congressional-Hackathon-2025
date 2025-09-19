"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ExternalLink, Download, ArrowLeft, Filter, LinkIcon, Calendar, Building, Users } from "lucide-react"
import Link from "next/link"

// Mock document data
const relatedDocuments = {
  gao: [
    {
      id: "gao-23-105",
      title: "Social Media: Federal Agencies Need Better Coordination to Address Challenges",
      date: "2023-03-15",
      pages: 89,
      summary: "GAO review of federal agency coordination on social media platform oversight and regulation.",
      relevance: "high",
      citations: 12,
      linkedHearings: ["Social Media Platform Accountability", "Tech Industry Oversight"],
    },
    {
      id: "gao-22-104782",
      title: "Internet Privacy: Additional Federal Action Needed",
      date: "2022-09-22",
      pages: 67,
      summary: "Analysis of federal privacy regulations and recommendations for improvement.",
      relevance: "medium",
      citations: 8,
      linkedHearings: ["Data Privacy Standards"],
    },
  ],
  crs: [
    {
      id: "crs-r46751",
      title: "Section 230: An Overview",
      date: "2023-01-10",
      pages: 34,
      summary: "Comprehensive overview of Section 230 of the Communications Decency Act.",
      relevance: "high",
      citations: 15,
      linkedHearings: ["Social Media Platform Accountability", "Content Moderation Policies"],
    },
    {
      id: "crs-r45650",
      title: "Data Protection Law: An Introduction to General Principles",
      date: "2022-11-18",
      pages: 28,
      summary: "Introduction to data protection principles and federal privacy law framework.",
      relevance: "medium",
      citations: 6,
      linkedHearings: ["Data Privacy Standards", "Consumer Protection"],
    },
  ],
  other: [
    {
      id: "pew-2023-social",
      title: "Social Media Use in 2023",
      source: "Pew Research Center",
      date: "2023-04-12",
      pages: 45,
      summary: "Comprehensive survey of American social media usage patterns and trends.",
      relevance: "high",
      citations: 23,
      linkedHearings: ["Social Media Platform Accountability"],
    },
    {
      id: "ftc-2023-privacy",
      title: "Privacy and Data Security Update: 2023",
      source: "Federal Trade Commission",
      date: "2023-02-28",
      pages: 156,
      summary: "Annual update on privacy enforcement actions and data security trends.",
      relevance: "medium",
      citations: 11,
      linkedHearings: ["Data Privacy Standards", "Consumer Protection"],
    },
  ],
}

export default function DocumentsView({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRelevance, setSelectedRelevance] = useState("all")
  const [activeTab, setActiveTab] = useState("gao")

  const filterDocuments = (docs: any[]) => {
    return docs.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRelevance = selectedRelevance === "all" || doc.relevance === selectedRelevance
      return matchesSearch && matchesRelevance
    })
  }

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const DocumentCard = ({ doc, type }: { doc: any; type: string }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg text-balance">{doc.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(doc.date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {doc.pages} pages
              </div>
              {doc.source && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {doc.source}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getRelevanceColor(doc.relevance)}>{doc.relevance} relevance</Badge>
            <Badge variant="outline">{type.toUpperCase()}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{doc.summary}</p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
            <span>{doc.citations} citations</span>
          </div>
          <div className="flex items-center gap-1">
            <LinkIcon className="h-3 w-3 text-muted-foreground" />
            <span>{doc.linkedHearings.length} linked hearings</span>
          </div>
        </div>

        {doc.linkedHearings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Linked Hearings:</h4>
            <div className="flex flex-wrap gap-2">
              {doc.linkedHearings.map((hearing: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {hearing}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <Download className="mr-1 h-3 w-3" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent">
            <ExternalLink className="mr-1 h-3 w-3" />
            View Online
          </Button>
          <Button size="sm" className="flex-1">
            <LinkIcon className="mr-1 h-3 w-3" />
            Link to Prep Sheet
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hearings?type=historical">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Historical Hearings
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-balance">Related Documents</h1>
          <p className="text-muted-foreground mt-2">GAO reports, CRS reports, and other linked documents</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Relevance</label>
              <Select value={selectedRelevance} onValueChange={setSelectedRelevance}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Relevance</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedRelevance("all")
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gao">GAO Reports ({relatedDocuments.gao.length})</TabsTrigger>
          <TabsTrigger value="crs">CRS Reports ({relatedDocuments.crs.length})</TabsTrigger>
          <TabsTrigger value="other">Other Documents ({relatedDocuments.other.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="gao" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterDocuments(relatedDocuments.gao).map((doc) => (
              <DocumentCard key={doc.id} doc={doc} type="gao" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterDocuments(relatedDocuments.crs).map((doc) => (
              <DocumentCard key={doc.id} doc={doc} type="crs" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="other" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterDocuments(relatedDocuments.other).map((doc) => (
              <DocumentCard key={doc.id} doc={doc} type="other" />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Relationship Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Document Relationships
          </CardTitle>
          <CardDescription>Visual map of document connections and citations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="flex justify-center items-center space-x-8">
                <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
                  <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-sm font-medium">Current Hearing</div>
                  <div className="text-xs text-muted-foreground">Social Media Platform</div>
                </div>

                <div className="flex flex-col space-y-4">
                  <div className="bg-accent/10 border border-accent rounded-lg p-3">
                    <div className="text-xs font-medium">GAO-23-105</div>
                    <div className="text-xs text-muted-foreground">12 citations</div>
                  </div>
                  <div className="bg-accent/10 border border-accent rounded-lg p-3">
                    <div className="text-xs font-medium">CRS-R46751</div>
                    <div className="text-xs text-muted-foreground">15 citations</div>
                  </div>
                </div>

                <div className="bg-secondary border rounded-lg p-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <div className="text-sm font-medium">Related Hearings</div>
                  <div className="text-xs text-muted-foreground">3 connected</div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Interactive document relationship visualization would be implemented here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

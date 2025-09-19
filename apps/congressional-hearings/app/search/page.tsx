"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Search, Filter, Calendar, FileText, Users, ExternalLink, Archive, Download } from "lucide-react"
import Link from "next/link"

// Mock search data
const searchResults = {
  hearings: [
    {
      id: 1,
      title: "Social Media Platform Accountability",
      committee: "House Committee on Energy and Commerce",
      date: "2023-12-15",
      type: "upcoming",
      witnesses: ["Mark Zuckerberg", "Elon Musk"],
      summary: "Hearing on social media platform accountability and content moderation practices.",
      relevanceScore: 95,
    },
    {
      id: 2,
      title: "Artificial Intelligence in Healthcare",
      committee: "Senate Committee on Health, Education, Labor and Pensions",
      date: "2023-09-18",
      type: "historical",
      witnesses: ["Dr. Eric Topol", "Dr. Regina Barzilay"],
      summary: "Exploring the potential and challenges of AI implementation in healthcare systems.",
      relevanceScore: 87,
    },
  ],
  documents: [
    {
      id: "gao-23-105",
      title: "Social Media: Federal Agencies Need Better Coordination",
      type: "gao",
      date: "2023-03-15",
      pages: 89,
      summary: "GAO review of federal agency coordination on social media platform oversight.",
      relevanceScore: 92,
      linkedHearings: 3,
    },
    {
      id: "crs-r46751",
      title: "Section 230: An Overview",
      type: "crs",
      date: "2023-01-10",
      pages: 34,
      summary: "Comprehensive overview of Section 230 of the Communications Decency Act.",
      relevanceScore: 88,
      linkedHearings: 2,
    },
  ],
  transcripts: [
    {
      id: 1,
      hearingTitle: "Social Media Platform Accountability",
      speaker: "Rep. Johnson",
      excerpt:
        "According to the 2023 Pew Research study on social media usage, 72% of Americans get their news from social media platforms...",
      page: 23,
      date: "2023-12-15",
      relevanceScore: 94,
    },
    {
      id: 2,
      hearingTitle: "AI in Healthcare",
      speaker: "Dr. Topol",
      excerpt:
        "The integration of artificial intelligence in healthcare systems presents both unprecedented opportunities and significant challenges...",
      page: 45,
      date: "2023-09-18",
      relevanceScore: 89,
    },
  ],
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [selectedCommittees, setSelectedCommittees] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("relevance")
  const [committees, setCommittees] = useState<string[]>([])
  const [loadingCommittees, setLoadingCommittees] = useState(true)

  // Load committees from API
  useEffect(() => {
    async function loadCommittees() {
      try {
        const response = await fetch('/api/committees')
        if (response.ok) {
          const data = await response.json()
          setCommittees(data.committees || [])
        }
      } catch (error) {
        console.error('Error loading committees:', error)
      } finally {
        setLoadingCommittees(false)
      }
    }
    loadCommittees()
  }, [])

  const documentTypes = ["GAO Reports", "CRS Reports", "Other Documents"]

  const handleCommitteeChange = (committee: string, checked: boolean) => {
    setSelectedCommittees((prev) => (checked ? [...prev, committee] : prev.filter((c) => c !== committee)))
  }

  const handleTypeChange = (type: string, checked: boolean) => {
    setSelectedTypes((prev) => (checked ? [...prev, type] : prev.filter((t) => t !== type)))
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 80) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "gao":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "crs":
        return "bg-green-100 text-green-800 border-green-200"
      case "upcoming":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "historical":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const HearingResult = ({ hearing }: { hearing: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg text-balance">{hearing.title}</CardTitle>
            <CardDescription>{hearing.committee}</CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            <Badge className={getRelevanceColor(hearing.relevanceScore)}>{hearing.relevanceScore}% match</Badge>
            <Badge className={getTypeColor(hearing.type)}>{hearing.type}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{hearing.summary}</p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {new Date(hearing.date).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            {hearing.witnesses.length} witnesses
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-xs text-muted-foreground">Witnesses: {hearing.witnesses.join(", ")}</div>
          <Button size="sm" asChild>
            <Link href={hearing.type === "upcoming" ? `/upcoming` : `/historical/${hearing.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const DocumentResult = ({ document }: { document: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg text-balance">{document.title}</CardTitle>
            <CardDescription>{document.id}</CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            <Badge className={getRelevanceColor(document.relevanceScore)}>{document.relevanceScore}% match</Badge>
            <Badge className={getTypeColor(document.type)}>{document.type.toUpperCase()}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{document.summary}</p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {new Date(document.date).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-muted-foreground" />
            {document.pages} pages
          </div>
          <div className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
            {document.linkedHearings} linked hearings
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-3 w-3" />
              Download
            </Button>
            <Button size="sm">View Document</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const TranscriptResult = ({ transcript }: { transcript: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg text-balance">{transcript.hearingTitle}</CardTitle>
            <CardDescription>
              Page {transcript.page} • {transcript.speaker}
            </CardDescription>
          </div>
          <Badge className={getRelevanceColor(transcript.relevanceScore)}>{transcript.relevanceScore}% match</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-sm italic">"{transcript.excerpt}"</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {new Date(transcript.date).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-muted-foreground" />
            Page {transcript.page}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button size="sm" asChild>
            <Link href={`/historical/${transcript.id}/transcript`}>View Full Transcript</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Advanced Search</h1>
          <p className="text-muted-foreground mt-2">Search across hearings, documents, and transcripts</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Query
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search hearings, documents, transcripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-lg h-12"
              />
            </div>
            <Button size="lg" className="px-8">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="730">Last 2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Committees */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Committees</Label>
                <div className="space-y-2">
                  {committees.map((committee) => (
                    <div key={committee} className="flex items-center space-x-2">
                      <Checkbox
                        id={committee}
                        checked={selectedCommittees.includes(committee)}
                        onCheckedChange={(checked) => handleCommitteeChange(committee, checked as boolean)}
                      />
                      <Label htmlFor={committee} className="text-xs leading-tight">
                        {committee.replace("Committee on ", "")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Types */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Document Types</Label>
                <div className="space-y-2">
                  {documentTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                      />
                      <Label htmlFor={type} className="text-xs">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => {
                  setDateRange("all")
                  setSelectedCommittees([])
                  setSelectedTypes([])
                  setSortBy("relevance")
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        <div className="lg:col-span-3">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">All Results</TabsTrigger>
                <TabsTrigger value="hearings">Hearings ({searchResults.hearings.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({searchResults.documents.length})</TabsTrigger>
                <TabsTrigger value="transcripts">Transcripts ({searchResults.transcripts.length})</TabsTrigger>
              </TabsList>
              <div className="text-sm text-muted-foreground">
                {searchResults.hearings.length + searchResults.documents.length + searchResults.transcripts.length}{" "}
                results found
              </div>
            </div>

            <TabsContent value="all" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Hearings
                  </h3>
                  <div className="space-y-3">
                    {searchResults.hearings.map((hearing) => (
                      <HearingResult key={hearing.id} hearing={hearing} />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </h3>
                  <div className="space-y-3">
                    {searchResults.documents.map((document) => (
                      <DocumentResult key={document.id} document={document} />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Transcript Excerpts
                  </h3>
                  <div className="space-y-3">
                    {searchResults.transcripts.map((transcript) => (
                      <TranscriptResult key={transcript.id} transcript={transcript} />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hearings" className="space-y-4">
              {searchResults.hearings.map((hearing) => (
                <HearingResult key={hearing.id} hearing={hearing} />
              ))}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              {searchResults.documents.map((document) => (
                <DocumentResult key={document.id} document={document} />
              ))}
            </TabsContent>

            <TabsContent value="transcripts" className="space-y-4">
              {searchResults.transcripts.map((transcript) => (
                <TranscriptResult key={transcript.id} transcript={transcript} />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

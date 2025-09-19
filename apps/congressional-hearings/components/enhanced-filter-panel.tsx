"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  Filter, 
  Users, 
  X, 
  BarChart3, 
  MessageSquare,
  Clock,
  Gavel,
  UserCheck,
  FileText,
  ChevronRight,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TranscriptSegment {
  timestamp: string
  speaker: string
  role: string
  text: string
}

interface SpeakerStats {
  name: string
  role: string
  segmentCount: number
  wordCount: number
  speakingTime?: number
}

interface EnhancedFilterPanelProps {
  segments: TranscriptSegment[]
  searchTerm: string
  onSearchChange: (term: string) => void
  showAllSpeakers: boolean
  selectedSpeaker: string | null
  onSpeakerFilterChange: (showAll: boolean, speaker: string | null) => void
  showStats?: boolean
}

export function EnhancedFilterPanel({
  segments,
  searchTerm,
  onSearchChange,
  showAllSpeakers,
  selectedSpeaker,
  onSpeakerFilterChange,
  showStats = true
}: EnhancedFilterPanelProps) {
  const [activeTab, setActiveTab] = useState("filters")
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  
  // Calculate speaker statistics
  const speakerStats: SpeakerStats[] = Array.from(
    segments.reduce((map, seg) => {
      const existing = map.get(seg.speaker)
      const wordCount = seg.text.split(' ').length
      if (existing) {
        existing.segmentCount++
        existing.wordCount += wordCount
      } else {
        map.set(seg.speaker, {
          name: seg.speaker,
          role: seg.role,
          segmentCount: 1,
          wordCount
        })
      }
      return map
    }, new Map<string, SpeakerStats>()).values()
  ).sort((a, b) => b.segmentCount - a.segmentCount)

  const totalWords = speakerStats.reduce((sum, s) => sum + s.wordCount, 0)
  const totalSegments = segments.length

  const getRoleColor = (role: string) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('chair')) return 'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400'
    if (lowerRole.includes('committee')) return 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400'
    if (lowerRole.includes('witness')) return 'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-400'
    if (lowerRole.includes('ranking')) return 'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-400'
    return 'bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400'
  }

  const getRoleIcon = (role: string) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('chair')) return <Gavel className="h-4 w-4" />
    if (lowerRole.includes('witness')) return <UserCheck className="h-4 w-4" />
    if (lowerRole.includes('committee')) return <Users className="h-4 w-4" />
    return <Users className="h-4 w-4" />
  }

  const handleSearch = (term: string) => {
    onSearchChange(term)
    if (term && !searchHistory.includes(term)) {
      setSearchHistory([term, ...searchHistory.slice(0, 4)])
    }
  }

  const quickFilters = [
    { label: "All Speakers", icon: <Users className="h-4 w-4" />, action: () => onSpeakerFilterChange(true, null) },
    { label: "Witnesses Only", icon: <UserCheck className="h-4 w-4" />, action: () => {
      const witness = speakerStats.find(s => s.role.toLowerCase().includes('witness'))
      if (witness) onSpeakerFilterChange(false, witness.name)
    }},
    { label: "Committee Members", icon: <Gavel className="h-4 w-4" />, action: () => {
      const member = speakerStats.find(s => s.role.toLowerCase().includes('committee'))
      if (member) onSpeakerFilterChange(false, member.name)
    }},
  ]

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </TabsTrigger>
          {showStats && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* Filters Tab */}
        <TabsContent value="filters" className="flex-1 flex flex-col space-y-4 mt-4">
          {/* Search Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Search Transcript</h4>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search speakers, content..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && !searchTerm && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Recent searches</p>
                <div className="flex flex-wrap gap-1">
                  {searchHistory.map((term, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-secondary/80"
                      onClick={() => handleSearch(term)}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {searchTerm && (
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-3 w-3 text-yellow-500" />
                <span className="text-muted-foreground">
                  Found {segments.filter(s => 
                    s.text.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length} matches
                </span>
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Quick Filters
            </h4>
            <div className="grid gap-2">
              {quickFilters.map((filter, i) => (
                <Button
                  key={i}
                  variant={filter.label === "All Speakers" && showAllSpeakers ? "default" : "outline"}
                  size="sm"
                  onClick={filter.action}
                  className="justify-start"
                >
                  {filter.icon}
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Speaker Filter */}
          <div className="flex-1 flex flex-col space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Filter by Speaker
            </h4>
            
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2">
                {speakerStats.map(speaker => (
                  <button
                    key={speaker.name}
                    onClick={() => onSpeakerFilterChange(false, speaker.name)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      "hover:bg-muted/50",
                      !showAllSpeakers && selectedSpeaker === speaker.name
                        ? "bg-primary/10 border-primary/50"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(speaker.role)}
                          <span className="font-medium text-sm">{speaker.name}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getRoleColor(speaker.role))}
                        >
                          {speaker.role}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{speaker.segmentCount}</div>
                        <div className="text-xs text-muted-foreground">segments</div>
                      </div>
                    </div>
                    <Progress 
                      value={(speaker.wordCount / totalWords) * 100} 
                      className="mt-2 h-1"
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Active Filters Summary */}
          {(!showAllSpeakers || searchTerm) && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Active Filters</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onSpeakerFilterChange(true, null)
                    handleSearch("")
                  }}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {!showAllSpeakers && selectedSpeaker && (
                  <Badge variant="secondary" className="text-xs">
                    Speaker: {selectedSpeaker}
                    <button
                      onClick={() => onSpeakerFilterChange(true, null)}
                      className="ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => handleSearch("")}
                      className="ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        {showStats && (
          <TabsContent value="analytics" className="flex-1 flex flex-col space-y-4 mt-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Speakers</span>
                </div>
                <p className="text-lg font-semibold">{speakerStats.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Statements</span>
                </div>
                <p className="text-lg font-semibold">{totalSegments}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Words</span>
                </div>
                <p className="text-lg font-semibold">{totalWords.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Avg. Length</span>
                </div>
                <p className="text-lg font-semibold">
                  {Math.round(totalWords / totalSegments)} words
                </p>
              </div>
            </div>

            {/* Top Speakers */}
            <div className="flex-1 flex flex-col space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Speaker Participation
              </h4>
              
              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-3">
                  {speakerStats.slice(0, 10).map((speaker, index) => (
                    <div key={speaker.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{speaker.name}</p>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", getRoleColor(speaker.role))}
                            >
                              {speaker.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{speaker.segmentCount} statements</p>
                          <p className="text-xs text-muted-foreground">
                            {((speaker.wordCount / totalWords) * 100).toFixed(1)}% of words
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={(speaker.wordCount / totalWords) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* View Full Report Button */}
            <Button variant="outline" className="w-full" size="sm">
              View Full Analytics
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

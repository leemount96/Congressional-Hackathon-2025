"use client"

import { useMemo, useEffect, useRef, useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Clock, User, ChevronUp, ChevronDown, Copy, Share2, MessageSquare, Hash } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TranscriptSegment {
  timestamp: string
  speaker: string
  role: string
  text: string
}

interface EnhancedTranscriptViewerProps {
  content: string
  searchTerm?: string
  showAllSpeakers?: boolean
  selectedSpeaker?: string | null
  onTimestampClick?: (timestamp: string) => void
  showLineNumbers?: boolean
  enableCitation?: boolean
}

export function EnhancedTranscriptViewer({
  content,
  searchTerm = "",
  showAllSpeakers = true,
  selectedSpeaker = null,
  onTimestampClick,
  showLineNumbers = false,
  enableCitation = true
}: EnhancedTranscriptViewerProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set())
  const [copiedSegmentId, setCopiedSegmentId] = useState<number | null>(null)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const segmentRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  
  const segments = useMemo<TranscriptSegment[]>(() => {
    const lines = content.split('\n')
    const parsed: TranscriptSegment[] = []

    for (const line of lines) {
      // Match format: [00:00:00 - 00:00:00] Speaker Name (Role): Text
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
  }, [content])

  // Get unique speakers with stats
  const speakerStats = useMemo(() => {
    const stats = new Map<string, { role: string, count: number, wordCount: number }>()
    segments.forEach(seg => {
      const existing = stats.get(seg.speaker)
      const wordCount = seg.text.split(' ').length
      if (existing) {
        existing.count++
        existing.wordCount += wordCount
      } else {
        stats.set(seg.speaker, { role: seg.role, count: 1, wordCount })
      }
    })
    return stats
  }, [segments])

  // Filter segments based on search and speaker selection
  const filteredSegments = useMemo(() => {
    return segments.map((seg, index) => ({
      ...seg,
      index,
      matches: searchTerm && seg.text.toLowerCase().includes(searchTerm.toLowerCase())
    })).filter(seg => {
      const matchesSearch = !searchTerm ||
        seg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seg.speaker.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSpeaker = showAllSpeakers ||
        !selectedSpeaker ||
        seg.speaker === selectedSpeaker

      return matchesSearch && matchesSpeaker
    })
  }, [segments, searchTerm, showAllSpeakers, selectedSpeaker])

  // Calculate search matches
  const searchMatches = useMemo(() => {
    if (!searchTerm) return []
    return filteredSegments.filter(seg => 
      seg.text.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [filteredSegments, searchTerm])

  // Navigate through search results
  const navigateToSearchResult = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return
    
    let newIndex = currentSearchIndex
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchMatches.length
    } else {
      newIndex = currentSearchIndex - 1 < 0 ? searchMatches.length - 1 : currentSearchIndex - 1
    }
    
    setCurrentSearchIndex(newIndex)
    const targetSegment = searchMatches[newIndex]
    if (targetSegment && segmentRefs.current[targetSegment.index]) {
      segmentRefs.current[targetSegment.index]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }

  const getRoleColor = (role: string) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('chair')) return 'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    if (lowerRole.includes('committee')) return 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    if (lowerRole.includes('witness')) return 'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
    if (lowerRole.includes('ranking')) return 'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800'
    return 'bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800'
  }

  const getSpeakerTextColor = (role: string) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('chair')) return 'text-purple-700 dark:text-purple-400'
    if (lowerRole.includes('committee')) return 'text-blue-700 dark:text-blue-400'
    if (lowerRole.includes('witness')) return 'text-green-700 dark:text-green-400'
    if (lowerRole.includes('ranking')) return 'text-orange-700 dark:text-orange-400'
    return 'text-gray-700 dark:text-gray-400'
  }

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900/50 font-medium px-0.5 rounded">$1</mark>')
  }

  const copySegmentToClipboard = async (segment: TranscriptSegment, index: number) => {
    const citation = `${segment.speaker} (${segment.role}), ${segment.timestamp}: "${segment.text}"`
    await navigator.clipboard.writeText(citation)
    setCopiedSegmentId(index)
    setTimeout(() => setCopiedSegmentId(null), 2000)
  }

  const toggleSegmentExpansion = (index: number) => {
    const newExpanded = new Set(expandedSegments)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSegments(newExpanded)
  }

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return { text, isTruncated: false }
    return { 
      text: text.substring(0, maxLength) + '...', 
      isTruncated: true 
    }
  }

  return (
    <div className="space-y-1">
      {/* Search Navigation Bar */}
      {searchTerm && searchMatches.length > 0 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-3 mb-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {searchMatches.length} match{searchMatches.length !== 1 ? 'es' : ''} found
              {currentSearchIndex > 0 && ` (${currentSearchIndex + 1} of ${searchMatches.length})`}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigateToSearchResult('prev')}
                disabled={searchMatches.length === 0}
              >
                <ChevronUp className="h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigateToSearchResult('next')}
                disabled={searchMatches.length === 0}
              >
                Next
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <TooltipProvider>
        <div className="space-y-6 px-2">
          {filteredSegments.map((segment, index) => {
            const { text: displayText, isTruncated } = truncateText(
              segment.text,
              expandedSegments.has(segment.index) ? Infinity : 500
            )
            const isExpanded = expandedSegments.has(segment.index)
            
            return (
              <div
                key={segment.index}
                ref={el => segmentRefs.current[segment.index] = el}
                className={cn(
                  "group relative transition-all duration-200",
                  "hover:bg-muted/30 rounded-lg p-4 -mx-2",
                  segment.matches && "ring-2 ring-yellow-400/30 bg-yellow-50/30 dark:bg-yellow-900/10"
                )}
              >
                {/* Line Number */}
                {showLineNumbers && (
                  <div className="absolute -left-8 top-4 text-xs text-muted-foreground/50 select-none">
                    #{segment.index + 1}
                  </div>
                )}
                
                {/* Speaker Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <User className={cn("h-4 w-4", getSpeakerTextColor(segment.role))} />
                      <span className={cn("font-semibold text-base", getSpeakerTextColor(segment.role))}>
                        {segment.speaker}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-2 py-0.5", getRoleColor(segment.role))}
                    >
                      {segment.role}
                    </Badge>
                    <button
                      onClick={() => onTimestampClick?.(segment.timestamp)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      {segment.timestamp}
                    </button>
                    
                    {/* Speaking stats - shown on hover */}
                    {speakerStats.get(segment.speaker) && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground">
                        <MessageSquare className="inline h-3 w-3 mr-1" />
                        {speakerStats.get(segment.speaker)?.count} statements
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {enableCitation && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copySegmentToClipboard(segment, segment.index)}
                          >
                            {copiedSegmentId === segment.index ? (
                              <Hash className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {copiedSegmentId === segment.index ? 'Copied!' : 'Copy citation'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share segment</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Text Content */}
                <div
                  className={cn(
                    "text-sm leading-relaxed text-gray-700 dark:text-gray-300",
                    "transition-all duration-200",
                    isExpanded ? "" : "line-clamp-6"
                  )}
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(displayText)
                  }}
                />
                
                {/* Expand/Collapse Button */}
                {isTruncated && (
                  <button
                    onClick={() => toggleSegmentExpansion(segment.index)}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Show more <ChevronDown className="h-3 w-3" /></>
                    )}
                  </button>
                )}

                {/* Separator */}
                {index < filteredSegments.length - 1 && (
                  <div className="absolute bottom-0 left-4 right-4 h-px bg-border/50" />
                )}
              </div>
            )
          })}
        </div>
      </TooltipProvider>

      {/* Empty State */}
      {filteredSegments.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No transcript segments found matching your filters.</p>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search term or clearing filters.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

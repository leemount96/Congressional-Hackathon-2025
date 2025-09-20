"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronUp, 
  ChevronDown,
  Copy,
  Check,
  Maximize2,
  Clock,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TranscriptSegment {
  timestamp: string
  speaker: string
  role: string
  text: string
  index?: number
}

interface ExpandableTranscriptSegmentProps {
  segment: TranscriptSegment & { index: number; matches?: boolean }
  allSegments: TranscriptSegment[]
  searchTerm?: string
  onTimestampClick?: (timestamp: string) => void
}

export function ExpandableTranscriptSegment({
  segment,
  allSegments,
  searchTerm = "",
  onTimestampClick
}: ExpandableTranscriptSegmentProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [contextBefore, setContextBefore] = useState(2)
  const [contextAfter, setContextAfter] = useState(2)
  const [copied, setCopied] = useState(false)

  // Get context segments
  const contextSegments = useMemo(() => {
    const currentIndex = segment.index
    const before = []
    const after = []

    // Get segments before
    for (let i = Math.max(0, currentIndex - contextBefore); i < currentIndex; i++) {
      if (allSegments[i]) {
        before.push({ ...allSegments[i], index: i })
      }
    }

    // Get segments after
    for (let i = currentIndex + 1; i <= Math.min(allSegments.length - 1, currentIndex + contextAfter); i++) {
      if (allSegments[i]) {
        after.push({ ...allSegments[i], index: i })
      }
    }

    return { before, after }
  }, [segment.index, allSegments, contextBefore, contextAfter])

  const canLoadMoreBefore = segment.index - contextBefore > 0
  const canLoadMoreAfter = segment.index + contextAfter < allSegments.length - 1

  const loadMoreBefore = () => {
    setContextBefore(prev => Math.min(prev + 2, segment.index))
  }

  const loadMoreAfter = () => {
    setContextAfter(prev => Math.min(prev + 2, allSegments.length - segment.index - 1))
  }

  const getRoleColor = (role: string) => {
    const lowerRole = role.toLowerCase()
    if (lowerRole.includes('chair')) return 'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400'
    if (lowerRole.includes('committee')) return 'bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400'
    if (lowerRole.includes('witness')) return 'bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-400'
    if (lowerRole.includes('ranking')) return 'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-400'
    return 'bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400'
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
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? 
        `<mark class="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">${part}</mark>` : part
    ).join('')
  }

  const handleCopySegment = async () => {
    try {
      await navigator.clipboard.writeText(`${segment.speaker} (${segment.role}): ${segment.text}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const renderSegment = (seg: TranscriptSegment & { index: number }, isContext: boolean = false, isMainSegment: boolean = false) => (
    <div 
      key={seg.index}
      className={cn(
        "group relative p-4 rounded-lg transition-all",
        isContext && "opacity-60 hover:opacity-80",
        isMainSegment && "bg-primary/10 border-2 border-primary/30"
      )}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <div className="flex items-center gap-2">
          <User className={cn("h-4 w-4", getSpeakerTextColor(seg.role))} />
          <span className={cn(
            "font-semibold text-sm",
            getSpeakerTextColor(seg.role)
          )}>
            {seg.speaker}
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn("text-xs px-1.5 py-0", getRoleColor(seg.role))}
        >
          {seg.role}
        </Badge>
        <button
          onClick={() => onTimestampClick?.(seg.timestamp)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer"
        >
          <Clock className="h-3 w-3" />
          {seg.timestamp}
        </button>
      </div>
      
      <div
        className={cn(
          "text-sm leading-relaxed",
          isContext ? "text-muted-foreground" : "text-foreground"
        )}
        dangerouslySetInnerHTML={{
          __html: highlightSearchTerm(seg.text)
        }}
      />
    </div>
  )

  // Simple clickable segment for the main view
  return (
    <>
      <div 
        className={cn(
          "group relative p-4 rounded-lg transition-all cursor-pointer",
          "hover:bg-muted/50 border border-transparent hover:border-primary/20",
          segment.matches && "bg-yellow-50 dark:bg-yellow-900/10"
        )}
        onClick={() => setShowDialog(true)}
      >
        <div className="flex items-baseline gap-2 mb-2">
          <div className="flex items-center gap-2">
            <User className={cn("h-4 w-4", getSpeakerTextColor(segment.role))} />
            <span className={cn("font-semibold text-sm", getSpeakerTextColor(segment.role))}>
              {segment.speaker}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs px-1.5 py-0", getRoleColor(segment.role))}
          >
            {segment.role}
          </Badge>
          <span className="text-xs text-muted-foreground">
            <Clock className="inline h-3 w-3 mr-1" />
            {segment.timestamp}
          </span>
        </div>
        
        <div
          className="text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{
            __html: highlightSearchTerm(segment.text)
          }}
        />

        {/* Hover indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Dialog with context */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Transcript Context</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{segment.speaker}</span>
                <Badge variant="outline" className="text-xs">
                  {segment.role}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2 py-4">
              {/* Load more before */}
              {canLoadMoreBefore && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreBefore}
                    className="text-xs"
                  >
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Load 2 more before
                  </Button>
                </div>
              )}

              {/* Context before */}
              {contextSegments.before.length > 0 && (
                <div className="space-y-2">
                  {contextSegments.before.map(seg => renderSegment(seg, true))}
                </div>
              )}

              {/* Main segment - highlighted */}
              {renderSegment(segment, false, true)}

              {/* Context after */}
              {contextSegments.after.length > 0 && (
                <div className="space-y-2">
                  {contextSegments.after.map(seg => renderSegment(seg, true))}
                </div>
              )}

              {/* Load more after */}
              {canLoadMoreAfter && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreAfter}
                    className="text-xs"
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Load 2 more after
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer with actions */}
          <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySegment}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Main Segment
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
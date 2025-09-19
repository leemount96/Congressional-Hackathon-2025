import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight, Sparkles, FileText, BarChart3, Users, Search } from "lucide-react"

export default function TranscriptDemoPage() {
  // Example hearing ID - adjust as needed
  const exampleHearingId = "1" 
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Transcript UI Improvements</h1>
        <p className="text-xl text-muted-foreground">
          Compare the original and enhanced transcript viewer interfaces
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Original Version */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Original Transcript UI
            </CardTitle>
            <CardDescription>
              Current transcript viewer with basic functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Basic search functionality</li>
                <li>• Simple speaker filtering</li>
                <li>• Standard text display</li>
                <li>• Basic layout</li>
              </ul>
            </div>
            <div className="pt-4">
              <Button asChild className="w-full">
                <Link href={`/historical/${exampleHearingId}/transcript`}>
                  View Original UI
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Version */}
        <Card className="relative border-primary/50 shadow-lg">
          <div className="absolute -top-2 -right-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <Sparkles className="mr-1 h-3 w-3" />
              Enhanced
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Enhanced Transcript UI
            </CardTitle>
            <CardDescription>
              Improved interface with better UX and visual design
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">New Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Search className="h-3 w-3 text-green-600 mt-0.5" />
                  <span>Advanced search with navigation & highlighting</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-3 w-3 text-blue-600 mt-0.5" />
                  <span>Quick filters & speaker statistics</span>
                </li>
                <li className="flex items-start gap-2">
                  <BarChart3 className="h-3 w-3 text-purple-600 mt-0.5" />
                  <span>Analytics dashboard with insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-3 w-3 text-orange-600 mt-0.5" />
                  <span>Enhanced visual hierarchy & interactions</span>
                </li>
                <li>• Expandable segments with citations</li>
                <li>• Mobile-responsive sidebar</li>
                <li>• Improved typography & spacing</li>
                <li>• Copy & share functionality</li>
              </ul>
            </div>
            <div className="pt-4">
              <Button asChild className="w-full" variant="default">
                <Link href={`/historical/${exampleHearingId}/transcript-v2`}>
                  View Enhanced UI
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Key Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold">Better Search</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Navigate through search results with Previous/Next buttons. 
                  See match count and highlighted results in real-time.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold">Analytics</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  View speaker statistics, participation rates, word counts, 
                  and estimated reading time at a glance.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold">Visual Polish</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enhanced typography, better spacing, smooth animations, 
                  and improved color coding for different roles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Try both versions and experience the improvements in the enhanced UI
        </p>
      </div>
    </div>
  )
}

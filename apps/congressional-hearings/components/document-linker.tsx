"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FileText, LinkIcon, Plus, X } from "lucide-react"

interface Document {
  id: string
  title: string
  type: "gao" | "crs" | "other"
  date: string
  relevance: "high" | "medium" | "low"
  summary: string
}

interface DocumentLinkerProps {
  currentDocuments?: Document[]
  onDocumentsChange?: (documents: Document[]) => void
}

const availableDocuments: Document[] = [
  {
    id: "gao-23-105",
    title: "Social Media: Federal Agencies Need Better Coordination",
    type: "gao",
    date: "2023-03-15",
    relevance: "high",
    summary: "GAO review of federal agency coordination on social media platform oversight.",
  },
  {
    id: "crs-r46751",
    title: "Section 230: An Overview",
    type: "crs",
    date: "2023-01-10",
    relevance: "high",
    summary: "Comprehensive overview of Section 230 of the Communications Decency Act.",
  },
  {
    id: "pew-2023-social",
    title: "Social Media Use in 2023",
    type: "other",
    date: "2023-04-12",
    relevance: "medium",
    summary: "Comprehensive survey of American social media usage patterns.",
  },
  {
    id: "ftc-2023-privacy",
    title: "Privacy and Data Security Update: 2023",
    type: "other",
    date: "2023-02-28",
    relevance: "medium",
    summary: "Annual update on privacy enforcement actions and data security trends.",
  },
]

export function DocumentLinker({ currentDocuments = [], onDocumentsChange }: DocumentLinkerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(currentDocuments.map((doc) => doc.id))
  const [isOpen, setIsOpen] = useState(false)

  const filteredDocuments = availableDocuments.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocuments((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]))
  }

  const handleSave = () => {
    const linkedDocs = availableDocuments.filter((doc) => selectedDocuments.includes(doc.id))
    onDocumentsChange?.(linkedDocs)
    setIsOpen(false)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "gao":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "crs":
        return "bg-green-100 text-green-800 border-green-200"
      case "other":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Linked Documents
            </CardTitle>
            <CardDescription>Connect related GAO reports, CRS reports, and other documents</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Link Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Link Related Documents</DialogTitle>
                <DialogDescription>Select documents to link to this hearing or prep sheet</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Badge variant="outline">{selectedDocuments.length} selected</Badge>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-4 border rounded-lg transition-colors ${
                          selectedDocuments.includes(doc.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={() => handleDocumentToggle(doc.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm text-balance">{doc.title}</h4>
                              <div className="flex gap-1">
                                <Badge className={getTypeColor(doc.type)}>{doc.type.toUpperCase()}</Badge>
                                <Badge className={getRelevanceColor(doc.relevance)}>{doc.relevance}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{doc.summary}</p>
                            <div className="text-xs text-muted-foreground">
                              {new Date(doc.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Link {selectedDocuments.length} Documents</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {currentDocuments.length > 0 ? (
          <div className="space-y-3">
            {currentDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm text-balance">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">{doc.summary}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getTypeColor(doc.type)}>{doc.type.toUpperCase()}</Badge>
                  <Badge className={getRelevanceColor(doc.relevance)}>{doc.relevance}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updatedDocs = currentDocuments.filter((d) => d.id !== doc.id)
                      onDocumentsChange?.(updatedDocs)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents linked yet</p>
            <p className="text-xs">Click "Link Documents" to add related reports and resources</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

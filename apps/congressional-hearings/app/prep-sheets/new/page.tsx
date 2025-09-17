"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

const prepSheetTemplates = [
  {
    id: "standard",
    name: "Standard Hearing Prep",
    description: "Comprehensive preparation template for most hearings",
    sections: [
      "Executive Summary",
      "Hearing Overview",
      "Key Issues & Talking Points",
      "Witness Profiles",
      "Anticipated Questions",
      "Background Documents",
      "Related Legislation",
      "Media & Public Interest",
    ],
  },
  {
    id: "oversight",
    name: "Oversight Hearing",
    description: "Focused template for oversight and investigative hearings",
    sections: [
      "Investigation Summary",
      "Key Findings",
      "Witness Backgrounds",
      "Document Evidence",
      "Timeline of Events",
      "Potential Outcomes",
      "Follow-up Actions",
    ],
  },
  {
    id: "legislative",
    name: "Legislative Hearing",
    description: "Template for hearings on proposed legislation",
    sections: [
      "Bill Summary",
      "Legislative History",
      "Stakeholder Positions",
      "Economic Impact",
      "Implementation Challenges",
      "Amendment Considerations",
      "Voting Predictions",
    ],
  },
]

const committees = [
  "House Committee on Science, Space, and Technology",
  "Senate Committee on Banking, Housing, and Urban Affairs",
  "House Committee on Agriculture",
  "Senate Committee on Health, Education, Labor and Pensions",
  "House Committee on Energy and Commerce",
  "Senate Committee on Judiciary",
]

export default function NewPrepSheet() {
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    hearingTitle: "",
    committee: "",
    date: "",
    description: "",
    assignedTo: "",
    priority: "medium",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const selectedTemplateData = prepSheetTemplates.find((t) => t.id === selectedTemplate)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/prep-sheets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prep Sheets
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-balance">Create New Prep Sheet</h1>
          <p className="text-muted-foreground mt-2">Set up a new hearing preparation document</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Choose Template
              </CardTitle>
              <CardDescription>Select a template to get started quickly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {prepSheetTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox checked={selectedTemplate === template.id} className="mt-1" />
                    <div>
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedTemplateData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Template Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {selectedTemplateData.sections.map((section, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      {section}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Prep Sheet Details</CardTitle>
              <CardDescription>Fill in the basic information for your prep sheet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Prep Sheet Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., AI Regulation Oversight - Prep Sheet"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hearingTitle">Hearing Title</Label>
                  <Input
                    id="hearingTitle"
                    placeholder="e.g., Oversight of Federal AI Regulation"
                    value={formData.hearingTitle}
                    onChange={(e) => handleInputChange("hearingTitle", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="committee">Committee</Label>
                  <Select value={formData.committee} onValueChange={(value) => handleInputChange("committee", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select committee" />
                    </SelectTrigger>
                    <SelectContent>
                      {committees.map((committee) => (
                        <SelectItem key={committee} value={committee}>
                          {committee}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Hearing Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    placeholder="Staff member name"
                    value={formData.assignedTo}
                    onChange={(e) => handleInputChange("assignedTo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the hearing and preparation goals..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Create Prep Sheet
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/prep-sheets">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import { FileQuestion, Folder, FileKey, ScanLine } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/types"

interface StatsCardsProps {
  stats: DashboardStats
}

const statConfig = [
  {
    key: "quizzes" as const,
    label: "Quizzes",
    icon: FileQuestion,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "folders" as const,
    label: "Folders",
    icon: Folder,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    key: "answerKeys" as const,
    label: "Answer Keys",
    icon: FileKey,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    key: "scannedCopies" as const,
    label: "Scanned Copies",
    icon: ScanLine,
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
]

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map((stat) => (
        <Card key={stat.key} className="transition-shadow hover:shadow-md">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stats[stat.key]}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

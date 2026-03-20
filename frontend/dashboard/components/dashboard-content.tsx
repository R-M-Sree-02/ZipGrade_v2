"use client"

import { useState, useCallback } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { StatsCards } from "@/components/stats-cards"
import { QuizFolderManager } from "@/components/quiz-folder-manager"
import type { Quiz, Folder, DashboardStats } from "@/lib/types"

const initialQuizzes: Quiz[] = [
  {
    id: "q1",
    name: "Math Chapter 1 Quiz",
    description: "Basic algebra concepts",
    folderId: "f1",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "q2",
    name: "Math Chapter 2 Quiz",
    description: "Quadratic equations",
    folderId: "f1",
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "q3",
    name: "Science Midterm",
    description: "Biology and Chemistry",
    folderId: null,
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "q4",
    name: "History Final Exam",
    description: "World War II topics",
    folderId: "f2",
    createdAt: new Date("2024-02-10"),
  },
  {
    id: "q5",
    name: "English Vocabulary Test",
    description: "SAT prep vocabulary",
    folderId: null,
    createdAt: new Date("2024-02-15"),
  },
]

const initialFolders: Folder[] = [
  { id: "f1", name: "Mathematics", parentId: null, createdAt: new Date("2024-01-10") },
  { id: "f2", name: "Social Studies", parentId: null, createdAt: new Date("2024-01-12") },
  { id: "f3", name: "Algebra", parentId: "f1", createdAt: new Date("2024-01-14") },
]

export function DashboardContent() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes)
  const [folders, setFolders] = useState<Folder[]>(initialFolders)

  const stats: DashboardStats = {
    quizzes: quizzes.length,
    folders: folders.length,
    answerKeys: 12,
    scannedCopies: 156,
  }

  const handleAddQuiz = useCallback((name: string, description: string, folderId: string | null) => {
    const newQuiz: Quiz = {
      id: `q${Date.now()}`,
      name,
      description,
      folderId,
      createdAt: new Date(),
    }
    setQuizzes((prev) => [...prev, newQuiz])
  }, [])

  const handleAddFolder = useCallback((name: string, parentId: string | null) => {
    const newFolder: Folder = {
      id: `f${Date.now()}`,
      name,
      parentId,
      createdAt: new Date(),
    }
    setFolders((prev) => [...prev, newFolder])
  }, [])

  const handleMoveQuiz = useCallback((quizId: string, folderId: string | null) => {
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId ? { ...quiz, folderId } : quiz
      )
    )
  }, [])

  const handleDeleteQuiz = useCallback((quizId: string) => {
    setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId))
  }, [])

  const handleDeleteFolder = useCallback((folderId: string) => {
    // Get the folder being deleted to find its parent
    const folderToDelete = folders.find(f => f.id === folderId)
    const parentId = folderToDelete?.parentId ?? null
    
    // Move quizzes from deleted folder to parent folder
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.folderId === folderId ? { ...quiz, folderId: parentId } : quiz
      )
    )
    // Move subfolders to parent folder
    setFolders((prev) =>
      prev
        .filter((folder) => folder.id !== folderId)
        .map((folder) =>
          folder.parentId === folderId ? { ...folder, parentId } : folder
        )
    )
  }, [folders])

  const handleReorderQuizzes = useCallback((newQuizzes: Quiz[]) => {
    setQuizzes(newQuizzes)
  }, [])

  const handleReorderFolders = useCallback((newFolders: Folder[]) => {
    setFolders(newFolders)
  }, [])

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex flex-1 items-center">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your quizzes and grading
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Quiz & Folder Manager */}
          <QuizFolderManager
            quizzes={quizzes}
            folders={folders}
            onMoveQuiz={handleMoveQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onDeleteFolder={handleDeleteFolder}
            onReorderQuizzes={handleReorderQuizzes}
            onReorderFolders={handleReorderFolders}
            onAddQuiz={handleAddQuiz}
            onAddFolder={handleAddFolder}
          />
        </div>
      </main>
    </div>
  )
}

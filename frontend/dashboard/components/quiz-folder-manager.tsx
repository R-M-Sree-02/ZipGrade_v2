"use client"

import dynamic from "next/dynamic"
import { Spinner } from "@/components/ui/spinner"

const QuizFolderManagerClient = dynamic(
  () => import("./quiz-folder-manager-client").then((mod) => mod.QuizFolderManagerClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    ),
  }
)

import type { Quiz, Folder } from "@/lib/types"

interface QuizFolderManagerProps {
  quizzes: Quiz[]
  folders: Folder[]
  onMoveQuiz: (quizId: string, folderId: string | null) => void
  onDeleteQuiz: (quizId: string) => void
  onDeleteFolder: (folderId: string) => void
  onReorderQuizzes: (quizzes: Quiz[]) => void
  onReorderFolders: (folders: Folder[]) => void
  onAddQuiz: (name: string, description: string, folderId: string | null) => void
  onAddFolder: (name: string, parentId: string | null) => void
}

export function QuizFolderManager(props: QuizFolderManagerProps) {
  return <QuizFolderManagerClient {...props} />
}

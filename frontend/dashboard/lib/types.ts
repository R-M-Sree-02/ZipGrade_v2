export interface Quiz {
  id: string
  name: string
  description: string
  folderId: string | null
  createdAt: Date
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
}

export interface DashboardStats {
  quizzes: number
  folders: number
  answerKeys: number
  scannedCopies: number
}

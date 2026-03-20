"use client"

import { useState, useCallback, useId, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { 
  Folder as FolderIcon, 
  FileQuestion, 
  GripVertical, 
  MoreHorizontal, 
  Trash2,
  ArrowLeft,
  Plus,
  FolderPlus,
  ChevronRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Quiz, Folder } from "@/lib/types"

interface QuizFolderManagerClientProps {
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

interface SortableQuizItemProps {
  quiz: Quiz
  onDelete: (id: string) => void
}

function SortableQuizItem({ quiz, onDelete }: SortableQuizItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: quiz.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <FileQuestion className="h-5 w-5 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{quiz.name}</p>
        {quiz.description && (
          <p className="text-sm text-muted-foreground truncate">{quiz.description}</p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(quiz.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface SortableFolderItemProps {
  folder: Folder
  itemCount: number
  onEnter: () => void
  onDelete: (id: string) => void
}

function SortableFolderItem({
  folder,
  itemCount,
  onEnter,
  onDelete,
}: SortableFolderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `folder-${folder.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:bg-accent/50 cursor-pointer ${isOver ? "ring-2 ring-primary ring-offset-2" : ""}`}
      onClick={onEnter}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <FolderIcon className="h-5 w-5 text-chart-4" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{folder.name}</p>
      </div>
      <Badge variant="secondary" className="text-xs">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folder.id)
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface QuickAddFormProps {
  type: "quiz" | "folder"
  existingNames: string[]
  onSubmit: (name: string, description?: string) => void
  onCancel: () => void
}

function QuickAddForm({ type, existingNames, onSubmit, onCancel }: QuickAddFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (value: string) => {
    setName(value)
    if (error) setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    
    if (!trimmedName) return
    
    // Check for duplicate name (case-insensitive)
    const isDuplicate = existingNames.some(
      (existingName) => existingName.toLowerCase() === trimmedName.toLowerCase()
    )
    
    if (isDuplicate) {
      setError(`A ${type} with this name already exists in this location`)
      return
    }
    
    onSubmit(trimmedName, type === "quiz" ? description.trim() : undefined)
    setName("")
    setDescription("")
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-3 space-y-3">
      <div>
        <input
          type="text"
          placeholder={type === "quiz" ? "Quiz name" : "Folder name"}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
            error ? "border-destructive focus:ring-destructive" : "focus:ring-primary"
          }`}
          autoFocus
        />
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
      {type === "quiz" && (
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim()}>
          Add {type === "quiz" ? "Quiz" : "Folder"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function QuizFolderManagerClient({
  quizzes,
  folders,
  onMoveQuiz,
  onDeleteQuiz,
  onDeleteFolder,
  onReorderQuizzes,
  onReorderFolders,
  onAddQuiz,
  onAddFolder,
}: QuizFolderManagerClientProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAddQuiz, setShowAddQuiz] = useState(false)
  const [showAddFolder, setShowAddFolder] = useState(false)
  const dndContextId = useId()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    const path: Folder[] = []
    let currentId = currentFolderId
    while (currentId) {
      const folder = folders.find((f) => f.id === currentId)
      if (folder) {
        path.unshift(folder)
        currentId = folder.parentId
      } else {
        break
      }
    }
    return path
  }, [currentFolderId, folders])

  const currentFolder = currentFolderId 
    ? folders.find((f) => f.id === currentFolderId) 
    : null

  // Get folders at the current level
  const currentFolders = folders.filter((f) => f.parentId === currentFolderId)
  
  // Get quizzes at the current level
  const currentQuizzes = quizzes.filter((q) => q.folderId === currentFolderId)

  // Count items in a folder (subfolders + quizzes)
  const getItemCount = useCallback((folderId: string) => {
    const subfolderCount = folders.filter((f) => f.parentId === folderId).length
    const quizCount = quizzes.filter((q) => q.folderId === folderId).length
    return subfolderCount + quizCount
  }, [folders, quizzes])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeType = active.id.toString().startsWith("folder-") ? "folder" : "quiz"
    const overType = over.id.toString().startsWith("folder-") ? "folder" : "quiz"

    // If dragging a quiz over a folder, move it into the folder
    if (activeType === "quiz" && overType === "folder") {
      const folderId = over.id.toString().replace("folder-", "")
      onMoveQuiz(active.id.toString(), folderId)
      return
    }

    // Reordering quizzes
    if (activeType === "quiz" && overType === "quiz") {
      const oldIndex = quizzes.findIndex((q) => q.id === active.id)
      const newIndex = quizzes.findIndex((q) => q.id === over.id)

      if (oldIndex !== newIndex) {
        const newQuizzes = [...quizzes]
        const [removed] = newQuizzes.splice(oldIndex, 1)
        newQuizzes.splice(newIndex, 0, removed)
        onReorderQuizzes(newQuizzes)
      }
    }

    // Reordering folders
    if (activeType === "folder" && overType === "folder") {
      const oldIndex = folders.findIndex((f) => `folder-${f.id}` === active.id)
      const newIndex = folders.findIndex((f) => `folder-${f.id}` === over.id)

      if (oldIndex !== newIndex) {
        const newFolders = [...folders]
        const [removed] = newFolders.splice(oldIndex, 1)
        newFolders.splice(newIndex, 0, removed)
        onReorderFolders(newFolders)
      }
    }
  }

  const handleAddQuizSubmit = useCallback((name: string, description?: string) => {
    onAddQuiz(name, description || "", currentFolderId)
    setShowAddQuiz(false)
  }, [onAddQuiz, currentFolderId])

  const handleAddFolderSubmit = useCallback((name: string) => {
    onAddFolder(name, currentFolderId)
    setShowAddFolder(false)
  }, [onAddFolder, currentFolderId])

  const handleGoBack = useCallback(() => {
    if (currentFolder) {
      setCurrentFolderId(currentFolder.parentId)
    }
  }, [currentFolder])

  const activeQuiz = activeId ? quizzes.find((q) => q.id === activeId) : null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`hover:text-foreground transition-colors ${
                currentFolderId === null ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              All Items
            </button>
            {breadcrumbPath.map((folder) => (
              <span key={folder.id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => setCurrentFolderId(folder.id)}
                  className={`hover:text-foreground transition-colors ${
                    folder.id === currentFolderId ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
          
          {/* Header with title and actions */}
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {currentFolder ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -ml-2"
                    onClick={handleGoBack}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <FolderIcon className="h-5 w-5 text-chart-4" />
                  {currentFolder.name}
                </>
              ) : (
                <>
                  <FolderIcon className="h-5 w-5 text-chart-4" />
                  All Items
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddFolder(true)
                  setShowAddQuiz(false)
                }}
                className="gap-1"
              >
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Folder</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowAddQuiz(true)
                  setShowAddFolder(false)
                }}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Quiz</span>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          id={dndContextId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            {/* Quick Add Forms */}
            {showAddFolder && (
              <QuickAddForm
                type="folder"
                existingNames={currentFolders.map((f) => f.name)}
                onSubmit={handleAddFolderSubmit}
                onCancel={() => setShowAddFolder(false)}
              />
            )}
            {showAddQuiz && (
              <QuickAddForm
                type="quiz"
                existingNames={currentQuizzes.map((q) => q.name)}
                onSubmit={handleAddQuizSubmit}
                onCancel={() => setShowAddQuiz(false)}
              />
            )}

            {/* Folders at current level */}
            <SortableContext
              items={currentFolders.map((f) => `folder-${f.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {currentFolders.map((folder) => (
                <SortableFolderItem
                  key={folder.id}
                  folder={folder}
                  itemCount={getItemCount(folder.id)}
                  onEnter={() => setCurrentFolderId(folder.id)}
                  onDelete={onDeleteFolder}
                />
              ))}
            </SortableContext>

            {/* Quizzes at current level */}
            <SortableContext
              items={currentQuizzes.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {currentQuizzes.map((quiz) => (
                <SortableQuizItem
                  key={quiz.id}
                  quiz={quiz}
                  onDelete={onDeleteQuiz}
                />
              ))}
            </SortableContext>

            {/* Empty State */}
            {currentFolders.length === 0 && currentQuizzes.length === 0 && !showAddQuiz && !showAddFolder && (
              <div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
                {currentFolder 
                  ? "This folder is empty. Add quizzes or folders to get started."
                  : "No items yet. Create a quiz or folder to get started."}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeQuiz && (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <FileQuestion className="h-5 w-5 text-primary" />
                <span className="font-medium">{activeQuiz.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  )
}

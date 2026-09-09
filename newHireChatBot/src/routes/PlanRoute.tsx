import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { askAssistant } from '../util/askApi.ts'
import { generatePlan } from '../util/planApi'
import './Plan.css'
import PlanOverview from './PlanOverview'
import PlanTaskList from './PlanTaskList'
import PlanChatPanel from './PlanChatPanel'

export type PendingTask = {
  id: number
  phase: string
  text: string
  due: string
}

export type CompletedTask = {
  id: number
  phase: string
  text: string
  due: string
  completedOn: string
}

export type OnboardingPlan = {
  plan30Day: string
  plan60Day: string
  plan90Day: string
}

type PlanRouteProps = {
  username: string
  userId?: number
  role: string
  department: string
  token: string
  canManageTasks: boolean
}

type SelectedUser = {
  id: number
  username: string
  role: string
  department: string
  plan30Day?: string
  plan60Day?: string
  plan90Day?: string
}

type ApiTask = {
  id: number
  text: string
  completed?: boolean
  createdAt?: string
}

type ChatMessage = {
  sender: 'user' | 'assistant'
  text: string
}

const PHASE_ORDER: Record<string, number> = {
  'Week 1': 1,
  'Weeks 2-4': 2,
  'Day 30': 3,
  'Day 60': 4,
  'Day 90': 5,
}

const API_BASE_URL = 'http://localhost:3001'

function formatCompletedDate(timestamp?: string): string {
  if (!timestamp) {
    return new Date().toLocaleString()
  }

  const parsed = new Date(timestamp)

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toLocaleString()
  }

  return parsed.toLocaleString()
}

function parseTaskText(rawText: string): {
  phase: string
  text: string
} {
  const match = rawText.match(/^\[(.+?)\]\s*(.*)$/)

  if (!match) {
    return {
      phase: 'Task',
      text: rawText,
    }
  }

  const [, phase, text] = match

  return {
    phase: phase.trim(),
    text: text.trim() || rawText,
  }
}

function compareTaskPhase(
  a: { phase: string; id: number },
  b: { phase: string; id: number },
) {
  const phaseRankA =
    PHASE_ORDER[a.phase] ?? Number.MAX_SAFE_INTEGER

  const phaseRankB =
    PHASE_ORDER[b.phase] ?? Number.MAX_SAFE_INTEGER

  if (phaseRankA !== phaseRankB) {
    return phaseRankA - phaseRankB
  }

  return a.id - b.id
}

function PlanRoute({
  username,
  userId,
  role,
  department,
  token,
  canManageTasks,
}: PlanRouteProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedUser = (location.state as { selectedUser?: SelectedUser } | null)
    ?.selectedUser
  const targetUser = selectedUser ?? {
    id: userId,
    username,
    role,
    department,
  }

  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [taskError, setTaskError] = useState('')

  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const [isAsking, setIsAsking] = useState(false)
  const [chatError, setChatError] = useState('')

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [planStatus, setPlanStatus] = useState('')
  const [planResponse, setPlanResponse] = useState('')
  const [onboardingPlan, setOnboardingPlan] = useState<OnboardingPlan>({
    plan30Day: '',
    plan60Day: '',
    plan90Day: '',
  })

  const loadTasks = useCallback(
    async (targetUserId: number) => {
      setLoadingTasks(true)
      setTaskError('')

      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${targetUserId}/tasks`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          setPendingTasks([])
          setCompletedTasks([])
          setTaskError('Could not load tasks from the server.')
          return
        }

        const tasks = (await response.json()) as ApiTask[]

        const nextPending: PendingTask[] = tasks
          .filter((task) => !task.completed)
          .map((task) => ({
            id: task.id,
            ...parseTaskText(task.text),
            due: 'Pending',
          }))
          .sort(compareTaskPhase)

        const nextCompleted: CompletedTask[] = tasks
          .filter((task) => Boolean(task.completed))
          .map((task) => ({
            id: task.id,
            ...parseTaskText(task.text),
            due: 'Completed',
            completedOn: formatCompletedDate(task.createdAt),
          }))
          .sort(compareTaskPhase)

        setPendingTasks(nextPending)
        setCompletedTasks(nextCompleted)
      } catch {
        setPendingTasks([])
        setCompletedTasks([])
        setTaskError('Could not load tasks from the server.')
      } finally {
        setLoadingTasks(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!targetUser.id) {
      setPendingTasks([])
      setCompletedTasks([])
      setLoadingTasks(false)
      setTaskError('No user loaded. Please log in again.')
      return
    }

    void loadTasks(targetUser.id)
  }, [targetUser.id, loadTasks])

  useEffect(() => {
    setOnboardingPlan({
      plan30Day: selectedUser?.plan30Day ?? '',
      plan60Day: selectedUser?.plan60Day ?? '',
      plan90Day: selectedUser?.plan90Day ?? '',
    })
  }, [selectedUser])

  async function handleGeneratePlan() {
    if (!userId) {
      setTaskError('No user loaded. Please log in again.')
      return
    }

    const trimmedRole = role.trim()
    const trimmedDepartment = department.trim()

    if (!trimmedRole || !trimmedDepartment) {
      setTaskError('Missing role or department context. Please log in again.')
      return
    }

    setPlanStatus('')
    setTaskError('')
    setIsGeneratingPlan(true)

    const result = await generatePlan(
      userId,
      trimmedRole,
      trimmedDepartment,
      token,
    )

    if (!result.ok) {
      setTaskError(result.message)
      setIsGeneratingPlan(false)
      return
    }

    setPlanResponse(result.response ?? '')

    await loadTasks(userId)

    setPlanStatus(result.message)
    setIsGeneratingPlan(false)
  }

  async function completeTask(
    taskId: number,
    completed: boolean,
  ) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tasks/${taskId}/complete`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completed }),
        },
      )

      if (!response.ok) {
        setTaskError('Could not update task status in the server.')
        return
      }

      setTaskError('')
      await loadTasks(targetUser.id!)
    } catch {
      setTaskError('Could not update task status in the server.')
    }
  }

  async function addTask(text: string) {
    if (!targetUser.id) {
      setTaskError('No user loaded. Please log in again.')
      return false
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUser.id}/tasks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        },
      )

      if (!response.ok) {
        setTaskError('Could not add the task to the server.')
        return false
      }

      setTaskError('')
      await loadTasks(targetUser.id)
      return true
    } catch {
      setTaskError('Could not add the task to the server.')
      return false
    }
  }

  async function editTask(taskId: number, text: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        setTaskError('Could not update the task in the server.')
        return false
      }

      setTaskError('')
      await loadTasks(targetUser.id!)
      return true
    } catch {
      setTaskError('Could not update the task in the server.')
      return false
    }
  }

  async function deleteTask(taskId: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        setTaskError('Could not delete the task from the server.')
        return
      }

      setTaskError('')
      await loadTasks(targetUser.id!)
    } catch {
      setTaskError('Could not delete the task from the server.')
    }
  }

  function updatePlanWindow(
    window: keyof OnboardingPlan,
    text: string,
  ) {
    setOnboardingPlan((currentPlan) => ({
      ...currentPlan,
      [window]: text,
    }))
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedPrompt = chatInput.trim()

    if (!trimmedPrompt) {
      setChatError('Please enter a question before asking.')
      return
    }

    setChatError('')
    setIsAsking(true)
    setChatInput('')

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: 'user',
        text: trimmedPrompt,
      },
    ])

    const result = await askAssistant(
      role,
      department,
      trimmedPrompt,
    )

    setIsAsking(false)

    if (!result.ok || !result.response) {
      setChatError(result.message)
      return
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: 'assistant',
        text: result.response ?? '',
      },
    ])
  }

  return (
    <section className="plan-shell">
      <header className="plan-header">
        <h1>
          {`${username || 'New Hire'} Onboarding Plan`}
          {selectedUser ? `: ${targetUser.username}` : ''}
        </h1>

        <button
          type="button"
          className="plan-back"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </header>

      <main className={`plan-layout ${canManageTasks ? 'manager-plan-layout' : ''}`}>
        <PlanOverview
          planResponse={planResponse}
          onboardingPlan={onboardingPlan}
          canManagePlans={canManageTasks}
          onUpdatePlanWindow={updatePlanWindow}
        />

        <PlanTaskList
          pendingTasks={pendingTasks}
          completedTasks={completedTasks}
          loadingTasks={loadingTasks}
          taskError={taskError}
          planStatus={planStatus}
          onToggleTask={completeTask}
          canManageTasks={canManageTasks}
          onAddTask={addTask}
          onEditTask={editTask}
          onDeleteTask={deleteTask}
        />

        {!canManageTasks ? (
          <PlanChatPanel
            chatMessages={chatMessages}
            chatError={chatError}
            chatInput={chatInput}
            isAsking={isAsking}
            isGeneratingPlan={isGeneratingPlan}
            onChatInputChange={setChatInput}
            onAsk={handleAsk}
            onGeneratePlan={handleGeneratePlan}
          />
        ) : null}
      </main>
    </section>
  )
}

export default PlanRoute
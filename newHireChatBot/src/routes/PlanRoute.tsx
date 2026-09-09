import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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

export type NarrativePlan = {
  week_1: string
  week_2_4: string
  day_30: string
  day_60: string
  day_90: string
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

type ApiUser = SelectedUser & {
  userType: string
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

async function getApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string
      detail?: string
    }
    const message = body.error ?? body.detail

    if (message) {
      return `${message} (HTTP ${response.status})`
    }
  } catch {
    // Use the operation-specific fallback when the response is not JSON.
  }

  return `${fallbackMessage} (HTTP ${response.status})`
}

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

function buildTaskContext(
  pendingTasks: PendingTask[],
  completedTasks: CompletedTask[],
): string[] {
  const combined = [
    ...pendingTasks.map((task) => ({
      id: task.id,
      phase: task.phase,
      text: task.text,
      status: 'pending',
    })),
    ...completedTasks.map((task) => ({
      id: task.id,
      phase: task.phase,
      text: task.text,
      status: 'completed',
    })),
  ].sort(compareTaskPhase)

  return combined.map(
    (task) => `id=${task.id}; status=${task.status}; phase=${task.phase}; text=${task.text}`,
  )
}

function buildPlanTaskPayload(
  pendingTasks: PendingTask[],
  completedTasks: CompletedTask[],
): string[] {
  return [
    ...pendingTasks.map((task) => `[${task.phase}] ${task.text}`),
    ...completedTasks.map((task) => `[${task.phase}] ${task.text}`),
  ]
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
  const [searchParams] = useSearchParams()
  const selectedUserFromRoute = (location.state as { selectedUser?: SelectedUser } | null)
    ?.selectedUser
  const selectedUserId = Number(searchParams.get('userId'))
  const hasSelectedUserId = Number.isInteger(selectedUserId) && selectedUserId > 0
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(
    selectedUserFromRoute ?? null,
  )
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(
    canManageTasks && hasSelectedUserId,
  )
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
  const [narrativePlan, setNarrativePlan] = useState<NarrativePlan | null>(null)
  const [onboardingPlan, setOnboardingPlan] = useState<OnboardingPlan>({
    plan30Day: '',
    plan60Day: '',
    plan90Day: '',
  })

  useEffect(() => {
    if (!canManageTasks || !hasSelectedUserId) {
      setSelectedUser(null)
      setLoadingSelectedUser(false)
      return
    }

    let cancelled = false

    async function loadSelectedUser() {
      setLoadingSelectedUser(true)

      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (!cancelled) {
            setTaskError(
              await getApiError(response, 'Could not load the selected user.'),
            )
            setSelectedUser(null)
          }
          return
        }

        const users = (await response.json()) as ApiUser[]
        const user = users.find(
          (candidate) => candidate.id === selectedUserId && candidate.userType === 'new_hire',
        )

        if (!cancelled) {
          setSelectedUser(user ?? null)
          if (!user) {
            setTaskError('The selected new hire could not be found.')
          }
        }
      } catch {
        if (!cancelled) {
          setTaskError('Could not load the selected user.')
          setSelectedUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingSelectedUser(false)
        }
      }
    }

    void loadSelectedUser()

    return () => {
      cancelled = true
    }
  }, [canManageTasks, hasSelectedUserId, selectedUserFromRoute, selectedUserId, token])

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
          setTaskError(
            await getApiError(response, 'Could not load tasks from the server.'),
          )
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
    if (loadingSelectedUser) {
      return
    }

    if (!targetUser.id) {
      setPendingTasks([])
      setCompletedTasks([])
      setLoadingTasks(false)
      setTaskError('No user loaded. Please log in again.')
      return
    }

    void loadTasks(targetUser.id)
  }, [loadingSelectedUser, targetUser.id, loadTasks])

  useEffect(() => {
    setOnboardingPlan({
      plan30Day: selectedUser?.plan30Day ?? '',
      plan60Day: selectedUser?.plan60Day ?? '',
      plan90Day: selectedUser?.plan90Day ?? '',
    })
  }, [selectedUser])

  useEffect(() => {
    if (loadingSelectedUser || !targetUser.id) {
      return
    }

    let cancelled = false

    async function loadSavedPlan() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${targetUser.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok || cancelled) {
          return
        }

        const user = (await response.json()) as SelectedUser
        setOnboardingPlan({
          plan30Day: user.plan30Day ?? '',
          plan60Day: user.plan60Day ?? '',
          plan90Day: user.plan90Day ?? '',
        })
      } catch {
        // Keep any plan data already supplied by the selected-user route state.
      }
    }

    void loadSavedPlan()

    return () => {
      cancelled = true
    }
  }, [loadingSelectedUser, targetUser.id, token])

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
      1,
      buildPlanTaskPayload(pendingTasks, completedTasks),
      onboardingPlan,
      token,
    )

    if (!result.ok) {
      setTaskError(result.message)
      setIsGeneratingPlan(false)
      return
    }

    setPlanResponse(result.response ?? '')
    setNarrativePlan(result.narrativePlan ?? null)
    if (result.narrativePlan) {
      setOnboardingPlan({
        plan30Day: result.narrativePlan.day_30,
        plan60Day: result.narrativePlan.day_60,
        plan90Day: result.narrativePlan.day_90,
      })
    }

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
        setTaskError(
          await getApiError(response, 'Could not update task status in the server.'),
        )
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
        setTaskError(
          await getApiError(response, 'Could not add the task to the server.'),
        )
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
        setTaskError(
          await getApiError(response, 'Could not update the task in the server.'),
        )
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
        setTaskError(
          await getApiError(response, 'Could not delete the task from the server.'),
        )
        return
      }

      setTaskError('')
      await loadTasks(targetUser.id!)
    } catch {
      setTaskError('Could not delete the task from the server.')
    }
  }

  async function updatePlanWindow(
    window: keyof OnboardingPlan,
    text: string,
  ): Promise<boolean> {
    if (!targetUser.id) {
      setTaskError('No user loaded. Please log in again.')
      return false
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUser.id}/${window}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [window]: text }),
        },
      )

      if (!response.ok) {
        setTaskError(
          await getApiError(response, 'Could not update the plan in the server.'),
        )
        return false
      }

      setOnboardingPlan((currentPlan) => ({
        ...currentPlan,
        [window]: text,
      }))
      setTaskError('')
      return true
    } catch {
      setTaskError('Could not update the plan in the server.')
      return false
    }
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
      buildTaskContext(pendingTasks, completedTasks),
      token,
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
          narrativePlan={narrativePlan}
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
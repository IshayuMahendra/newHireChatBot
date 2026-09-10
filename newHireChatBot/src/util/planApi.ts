export type PlanResult = {
  ok: boolean
  message: string
  taskCount?: number
  response?: string
  narrativePlan?: {
    week_1: string
    week_2_4: string
    day_30: string
    day_60: string
    day_90: string
  }
}

type PlanPayload = {
  user_id: number
  role: string
  department: string
  onboarding_day: number
  current_tasks: string[]
  current_plan: {
    planWeek1: string
    planWeek2_4: string
    plan30Day: string
    plan60Day: string
    plan90Day: string
  }
}

const PLAN_API_URL = 'http://127.0.0.1:8000/plan'

export async function generatePlan(
  userId: number,
  role: string,
  department: string,
  onboardingDay: number,
  currentTasks: string[],
  currentPlan: {
    planWeek1: string
    planWeek2_4: string
    plan30Day: string
    plan60Day: string
    plan90Day: string
  },
  token: string,
): Promise<PlanResult> {
  const payload: PlanPayload = {
    user_id: userId,
    role: role.trim(),
    department: department.trim(),
    onboarding_day: onboardingDay,
    current_tasks: currentTasks,
    current_plan: currentPlan,
  }

  if (!payload.user_id || payload.user_id < 1) {
    return { ok: false, message: 'Invalid user ID. Please log in again.' }
  }

  if (!payload.role || !payload.department) {
    return {
      ok: false,
      message: 'Missing role or department context. Please log in again.',
    }
  }

  if (!token) {
    return { ok: false, message: 'Your session is missing an authentication token.' }
  }

  try {
    const response = await fetch(PLAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as {
      detail?: string
      task_count?: number
      response?: string
      narrative_plan?: {
        week_1: string
        week_2_4: string
        day_30: string
        day_60: string
        day_90: string
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        message: body.detail ?? 'Could not generate tasks right now. Please try again.',
      }
    }

    return {
      ok: true,
      message: 'Plan generated and tasks saved.',
      taskCount: body.task_count,
      response: body.response,
      narrativePlan: body.narrative_plan,
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the inference server. Make sure it is running on port 8000.',
    }
  }
}

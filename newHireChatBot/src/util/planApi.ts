export type PlanResult = {
  ok: boolean
  message: string
  taskCount?: number
  response?: string
}

type PlanPayload = {
  user_id: number
  role: string
  department: string
}

const PLAN_API_URL = 'http://127.0.0.1:8000/plan'

export async function generatePlan(
  userId: number,
  role: string,
  department: string,
): Promise<PlanResult> {
  const payload: PlanPayload = {
    user_id: userId,
    role: role.trim(),
    department: department.trim(),
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

  try {
    const response = await fetch(PLAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as {
      detail?: string
      task_count?: number
      response?: string
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
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the inference server. Make sure it is running on port 8000.',
    }
  }
}

export type AskResult = {
  ok: boolean
  message: string
  response?: string
  sources?: string[]
}

type AskPayload = {
  role: string
  department: string
  user_prompt: string
  current_tasks: string[]
}

const ASK_API_URL = 'http://127.0.0.1:8000/ask'

export async function askAssistant(
  role: string,
  department: string,
  userPrompt: string,
  currentTasks: string[],
  token: string,
): Promise<AskResult> {
  const payload: AskPayload = {
    role: role.trim(),
    department: department.trim(),
    user_prompt: userPrompt.trim(),
    current_tasks: currentTasks,
  }

  if (!payload.user_prompt) {
    return { ok: false, message: 'Please enter a question before asking.' }
  }

  if (!payload.role || !payload.department) {
    return {
      ok: false,
      message: 'Missing role or department context. Please log in again.',
    }
  }

  if (!token.trim()) {
    return {
      ok: false,
      message: 'Your session is missing an authentication token.',
    }
  }

  try {
    const response = await fetch(ASK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as {
      response?: string
      detail?: string
      rag?: { sources?: unknown }
    }

    if (!response.ok || !body.response) {
      return {
        ok: false,
        message: body.detail ?? 'The assistant could not answer right now. Please try again.',
      }
    }

    return {
      ok: true,
      message: 'Answer received.',
      response: body.response,
      sources: Array.isArray(body.rag?.sources)
        ? body.rag.sources.filter((source): source is string => typeof source === 'string')
        : [],
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the inference server. Make sure it is running on port 8000.',
    }
  }
}

export type AskResult = {
  ok: boolean
  message: string
  response?: string
}

type AskPayload = {
  role: string
  department: string
  user_prompt: string
}

const ASK_API_URL = 'http://127.0.0.1:8000/ask'

export async function askAssistant(
  role: string,
  department: string,
  userPrompt: string,
): Promise<AskResult> {
  const payload: AskPayload = {
    role: role.trim(),
    department: department.trim(),
    user_prompt: userPrompt.trim(),
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

  try {
    const response = await fetch(ASK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as { response?: string; detail?: string }

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
    }
  } catch {
    return {
      ok: false,
      message: 'Could not reach the inference server. Make sure it is running on port 8000.',
    }
  }
}

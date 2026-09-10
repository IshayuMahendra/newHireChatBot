import type { FormEvent } from 'react'
import './Plan.css'

type ChatMessage = {
  sender: 'user' | 'assistant'
  text: string
  sources?: string[]
}

type PlanChatPanelProps = {
  chatMessages: ChatMessage[]
  chatError: string
  chatInput: string
  isAsking: boolean
  onChatInputChange: (value: string) => void
  onAsk: (event: FormEvent<HTMLFormElement>) => void
}

function formatCitation(source: string): string {
  return source.replace(/\s*-\s*chunk\s+\d+\s*$/i, '').trim()
}

function PlanChatPanel({
  chatMessages,
  chatError,
  chatInput,
  isAsking,
  onChatInputChange,
  onAsk,
}: PlanChatPanelProps) {
  return (
    <section
      className="plan-chat"
      aria-label="AI chat panel"
    >
      <h2>Assistant Chat</h2>

      <div
        className="chat-window"
        role="log"
        aria-live="polite"
      >
        {chatMessages.length === 0 ? (
          <div className="chat-empty-state">
            <p>Hi, I&apos;m your onboarding assistant. Ask me anything as you get started.</p>
            <p>I can help you understand your tasks and onboarding plan, answer questions about the process, and point you to relevant policy sources.</p>
          </div>
        ) : (
          chatMessages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              className={`chat-message ${message.sender}`}
            >
              <span>{message.text}</span>
              {message.sender === 'assistant' && message.sources?.length ? (
                <div className="chat-citations" aria-label="Sources">
                  <strong>Sources</strong>
                  <ul>
                    {[...new Set(message.sources.map(formatCitation))].map((source) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {chatError ? (
        <p className="plan-subtext chat-error">
          {chatError}
        </p>
      ) : null}

      <form
        className="chat-input-row"
        onSubmit={onAsk}
      >
        <input
          type="text"
          value={chatInput}
          onChange={(event) =>
            onChatInputChange(event.target.value)
          }
          placeholder="Ask a question..."
          aria-label="Ask the assistant"
          disabled={isAsking}
        />

        <div className="chat-button-row">
          <button
            type="submit"
            disabled={isAsking}
          >
            {isAsking ? 'Asking...' : 'Ask'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default PlanChatPanel

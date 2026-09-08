import type { FormEvent } from 'react'
import './Plan.css'

type ChatMessage = {
  sender: 'user' | 'assistant'
  text: string
}

type PlanChatPanelProps = {
  chatMessages: ChatMessage[]
  chatError: string
  chatInput: string
  isAsking: boolean
  isGeneratingPlan: boolean
  onChatInputChange: (value: string) => void
  onAsk: (event: FormEvent<HTMLFormElement>) => void
  onGeneratePlan: () => Promise<void> | void
}

function PlanChatPanel({
  chatMessages,
  chatError,
  chatInput,
  isAsking,
  isGeneratingPlan,
  onChatInputChange,
  onAsk,
  onGeneratePlan,
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
          <p className="chat-empty-state">
            Chat messages will appear here.
          </p>
        ) : (
          chatMessages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              className={`chat-message ${message.sender}`}
            >
              {message.text}
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
            type="button"
            disabled={isGeneratingPlan || isAsking}
            onClick={() => void onGeneratePlan()}
          >
            {isGeneratingPlan
              ? 'Planning...'
              : 'Plan'}
          </button>

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

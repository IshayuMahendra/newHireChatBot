import { useState } from 'react'
import './Plan.css'
import type { NarrativePlan, OnboardingPlan } from './PlanRoute'

type PlanOverviewProps = {
  planResponse: string
  narrativePlan: NarrativePlan | null
  onboardingPlan: OnboardingPlan
  canManagePlans: boolean
  onUpdatePlanWindow: (
    window: keyof OnboardingPlan,
    text: string,
  ) => Promise<boolean>
}

const PLAN_WINDOWS: Array<{
  key: keyof OnboardingPlan
  label: string
}> = [
  { key: 'week1Outcome', label: 'Week 1' },
  { key: 'week2_4Outcome', label: 'Weeks 2-4' },
  { key: 'plan30Day', label: 'First 30 Days' },
  { key: 'plan60Day', label: 'Days 31-60' },
  { key: 'plan90Day', label: 'Days 61-90' },
]

function renderPlanText(text: string) {
  return text.split(/(\*\*[^*]+?\*\*)/g).map((segment, index) => {
    const isBold = segment.startsWith('**') && segment.endsWith('**')

    return isBold ? (
      <strong key={`bold-${index}`}>{segment.slice(2, -2)}</strong>
    ) : segment
  })
}

type PlanContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

function renderPlanContent(text: string) {
  const blocks: PlanContentBlock[] = []
  let paragraphLines: string[] = []
  let listItems: string[] = []

  function addParagraph() {
    if (paragraphLines.length) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') })
      paragraphLines = []
    }
  }

  function addList() {
    if (listItems.length) {
      blocks.push({ type: 'list', items: listItems })
      listItems = []
    }
  }

  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/)

    if (bullet) {
      addParagraph()
      listItems.push(bullet[1])
    } else if (line.trim()) {
      addList()
      paragraphLines.push(line)
    } else {
      addParagraph()
      addList()
    }
  }

  addParagraph()
  addList()

  return blocks.map((block, index) => (
    block.type === 'list' ? (
      <ul key={`list-${index}`} className="plan-response-list">
        {block.items.map((item, itemIndex) => (
          <li key={`item-${itemIndex}`}>{renderPlanText(item)}</li>
        ))}
      </ul>
    ) : (
      <p key={`paragraph-${index}`}>{renderPlanText(block.text)}</p>
    )
  ))
}

function PlanOverview({
  planResponse,
  narrativePlan,
  onboardingPlan,
  canManagePlans,
  onUpdatePlanWindow,
}: PlanOverviewProps) {
  const [editingWindow, setEditingWindow] = useState<keyof OnboardingPlan | null>(null)
  const [draftText, setDraftText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function beginEdit(window: keyof OnboardingPlan) {
    setEditingWindow(window)
    setDraftText(onboardingPlan[window])
  }

  async function saveEdit(window: keyof OnboardingPlan) {
    const text = draftText.trim()

    if (!text || isSaving) {
      return
    }

    setIsSaving(true)
    const updated = await onUpdatePlanWindow(window, text)
    setIsSaving(false)

    if (updated) {
      setEditingWindow(null)
      setDraftText('')
    }
  }

  return (
    <section
      className="plan-overview"
      aria-label="Onboarding plan"
    >
      <h2>Onboarding Plan</h2>

      <div className="plan-overview-scroll">
        {PLAN_WINDOWS.map(({ key, label }) => (
          <article key={key} className="plan-window">
            <div className="plan-window-heading">
              <h3>{label}</h3>
              {canManagePlans ? (
                <button
                  type="button"
                  className="plan-edit-button"
                  onClick={() => beginEdit(key)}
                >
                  Edit
                </button>
              ) : null}
            </div>

            {editingWindow === key ? (
              <div className="plan-window-editor">
                <textarea
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  aria-label={`Edit ${label} plan`}
                  autoFocus
                  disabled={isSaving}
                />
                <div>
                  <button type="button" onClick={() => void saveEdit(key)} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingWindow(null)} disabled={isSaving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : onboardingPlan[key] ? (
              <div className="plan-response">{renderPlanContent(onboardingPlan[key])}</div>
            ) : (
              <p className="plan-window-empty">No narrative has been saved for this window yet.</p>
            )}
          </article>
        ))}

        {planResponse && !narrativePlan ? (
          <div className="plan-response">{renderPlanContent(planResponse)}</div>
        ) : (
          <p className="plan-subtext">
            Generate a plan to see your onboarding roadmap.
          </p>
        )}
      </div>
    </section>
  )
}

export default PlanOverview

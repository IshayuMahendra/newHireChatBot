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
  ) => void
}

const PLAN_WINDOWS: Array<{
  key: keyof OnboardingPlan
  label: string
}> = [
  { key: 'plan30Day', label: 'First 30 Days' },
  { key: 'plan60Day', label: 'Days 31-60' },
  { key: 'plan90Day', label: 'Days 61-90' },
]

function PlanOverview({
  planResponse,
  narrativePlan,
  onboardingPlan,
  canManagePlans,
  onUpdatePlanWindow,
}: PlanOverviewProps) {
  const [editingWindow, setEditingWindow] = useState<keyof OnboardingPlan | null>(null)
  const [draftText, setDraftText] = useState('')

  function beginEdit(window: keyof OnboardingPlan) {
    setEditingWindow(window)
    setDraftText(onboardingPlan[window])
  }

  function saveEdit(window: keyof OnboardingPlan) {
    const text = draftText.trim()

    if (!text) {
      return
    }

    onUpdatePlanWindow(window, text)
    setEditingWindow(null)
    setDraftText('')
  }

  return (
    <section
      className="plan-overview"
      aria-label="Onboarding plan"
    >
      <h2>Onboarding Plan</h2>

      <div className="plan-overview-scroll">
        <article className="plan-window">
          <div className="plan-window-heading">
            <h3>Week 1</h3>
          </div>
          {narrativePlan?.week_1 ? (
            <p className="plan-response">{narrativePlan.week_1}</p>
          ) : (
            <p className="plan-window-empty">No narrative has been saved for Week 1 yet.</p>
          )}
        </article>

        <article className="plan-window">
          <div className="plan-window-heading">
            <h3>Weeks 2-4</h3>
          </div>
          {narrativePlan?.week_2_4 ? (
            <p className="plan-response">{narrativePlan.week_2_4}</p>
          ) : (
            <p className="plan-window-empty">No narrative has been saved for Weeks 2-4 yet.</p>
          )}
        </article>

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
                />
                <div>
                  <button type="button" onClick={() => saveEdit(key)}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingWindow(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : onboardingPlan[key] ? (
              <p className="plan-response">{onboardingPlan[key]}</p>
            ) : (
              <p className="plan-window-empty">No narrative has been saved for this window yet.</p>
            )}
          </article>
        ))}

        {planResponse && !narrativePlan ? (
          <p className="plan-response">{planResponse}</p>
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

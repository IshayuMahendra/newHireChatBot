import './Plan.css'

type PlanOverviewProps = {
  planResponse: string
}

function PlanOverview({ planResponse }: PlanOverviewProps) {
  return (
    <section
      className="plan-overview"
      aria-label="Onboarding plan"
    >
      <h2>Onboarding Plan</h2>

      <div className="plan-overview-scroll">
        {planResponse ? (
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

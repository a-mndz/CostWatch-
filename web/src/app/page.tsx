import { Reveal } from './components/Reveal';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>CostWatch</span>
        <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <a href="#features" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Features</a>
          <a href="#pricing" className="transition-colors duration-150 hover:text-[var(--text-primary)]">Pricing</a>
          <a
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--text-primary)',
            }}
            href="#"
          >
            Start Free Trial
          </a>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 py-24 md:py-32 max-w-4xl mx-auto text-center">
          <p
            className="text-sm font-medium mb-4 tracking-wide uppercase"
            style={{ color: 'var(--color-primary-light)', letterSpacing: '0.1em' }}
          >
            Built for DevOps &amp; FinOps teams
          </p>
          <h1 className="mb-6" style={{ color: 'var(--text-primary)' }}>
            Cloud cost anomalies<br />caught in minutes, not months
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto mb-8"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            Connect your AWS Cost &amp; Usage Report. Z-score filtering catches statistical outliers.
            LLM explains root causes no metric can — reserved instance expiry, misconfigured ASGs,
            forgotten dev environments.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              className="px-6 py-3 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90 active:scale-[0.97]"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'var(--bg)',
              }}
            href="/dashboard"
            >
              See Demo
            </a>
            <a
              className="px-6 py-3 rounded-lg font-medium transition-colors duration-150 hover:text-[var(--text-primary)] active:scale-[0.97]"
              style={{
                color: 'var(--text-secondary)',
              }}
              href="#features"
            >
              How it Works →
            </a>
          </div>
          <p className="text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            14-day free trial · No credit card · Works with existing billing permissions
          </p>
        </section>

        {/* Demo - Mock Slack Alert */}
        <Reveal>
          <section id="demo" className="px-6 py-16 max-w-3xl mx-auto">
            <p className="text-center text-sm font-medium mb-8" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              WHAT YOU&apos;LL SEE IN SLACK
            </p>
            <div
              className="rounded-xl p-6 md:p-8"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Slack-style header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}
                >
                  ⚠️
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>CostWatch Alert</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Today at 9:04 AM · #cost-alerts</p>
                </div>
              </div>

              {/* Alert content */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Dimension</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Service: EC2</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Date</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>July 15, 2026</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Severity</p>
                    <span
                      className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: 'var(--color-tertiary)', color: 'var(--bg)' }}
                    >
                      High
                    </span>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Expected</p>
                    <p className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>$1,240/mo</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Actual</p>
                    <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>$4,580/mo</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Change</p>
                    <p className="text-sm font-mono font-medium" style={{ color: 'var(--color-tertiary)' }}>+269%</p>
                  </div>
                </div>

                {/* Root cause */}
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-secondary)' }}>ROOT CAUSE (LLM)</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Reserved Instance for m5.xlarge fleet expired on July 14. On-demand pricing activated across
                    12 instances in us-east-1. Recommend purchasing new RIs or converting to Savings Plans.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}
                  >
                    View Runbook
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    Acknowledge
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    Open Jira Ticket
                  </button>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Stats bar */}
        <Reveal>
          <section
            className="px-6 py-12 border-y"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)' }}>$2.3M</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Anomalies caught</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)' }}>47%</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Teams saved &gt;$1K/mo</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)' }}>5min</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>To first anomaly</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-primary-light)', fontFamily: 'var(--font-mono)' }}>$0</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Per-seat pricing</p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* How it works */}
        <Reveal>
          <section id="features" className="px-6 py-20" style={{ borderColor: 'var(--border)' }}>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-center mb-12" style={{ color: 'var(--text-primary)' }}>How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: '1', title: 'Ingest your CUR', desc: 'Connect AWS Cost & Usage Report or GCP billing export. No agent, no CLI — just permissions.' },
                  { step: '2', title: 'Detect anomalies', desc: 'Z-score on daily spend by service, region, and account. LLM fills gaps where stats miss — reserved instance expiry, misconfigured ASGs.' },
                  { step: '3', title: 'Alert + act', desc: 'Slack message with root-cause summary and runbook link. One-click to notify the team or open a Jira ticket.' },
                ].map((item) => (
                  <div key={item.step}>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold mb-4"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--color-primary-light)' }}
                    >
                      {item.step}
                    </div>
                    <h3 className="mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* Features - two columns */}
        <Reveal>
          <section
            className="px-6 py-20"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="mb-6" style={{ color: 'var(--text-primary)' }}>Stop chasing phantom charges</h2>
                <ul className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Per-service, per-region anomaly detection — not just total spend',
                    'LLM explains why — reserved instance expiry, scale-out event, new service',
                    'Slack alerts with runbook links, not just dashboards you never open',
                    'Works with existing AWS/GCP billing — no new agents or sidecars',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span style={{ color: 'var(--success)', marginTop: '2px' }}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="mb-6" style={{ color: 'var(--text-primary)' }}>Built for the tools you already use</h2>
                <ul className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'REST API for custom workflows and integrations',
                    'Webhook alerts to PagerDuty, Opsgenie, or your own endpoint',
                    'Slack actions: approve spend, notify team, open Jira ticket',
                    'Export anomaly data to your BI tool via CSV or API',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span style={{ color: 'var(--success)', marginTop: '2px' }}>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Pricing */}
        <Reveal>
          <section id="pricing" className="px-6 py-20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}>Simple pricing</h2>
              <p className="mb-12" style={{ color: 'var(--text-secondary)' }}>
                Tied to your AWS/GCP spend, not your headcount.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Starter',
                    price: '$49',
                    period: '/mo',
                    desc: 'Up to $10K monthly spend',
                    features: ['AWS Cost & Usage Report', 'Daily anomaly detection', 'Slack alerts'],
                    primary: false,
                  },
                  {
                    name: 'Growth',
                    price: '$149',
                    period: '/mo',
                    desc: 'Up to $100K monthly spend',
                    features: ['AWS + GCP', 'Real-time detection', 'LLM root-cause summaries', 'Slack + Jira integration'],
                    primary: true,
                  },
                  {
                    name: 'Scale',
                    price: 'Custom',
                    period: '',
                    desc: '$100K+ monthly spend',
                    features: ['AWS + GCP + Azure', 'Custom anomaly rules', 'API access', 'SSO / SAML'],
                    primary: false,
                  },
                ].map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-xl p-6 text-left transition-all duration-150 hover:opacity-95"
                  style={{
                    border: tier.primary ? `2px solid var(--color-primary)` : `1px solid var(--border)`,
                    backgroundColor: tier.primary ? 'var(--bg-elevated)' : 'transparent',
                  }}
                >
                    {tier.primary && (
                      <span
                        className="inline-block px-3 py-0.5 text-xs font-medium rounded-full mb-4"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--bg)' }}
                      >
                        Most Popular
                      </span>
                    )}
                    <h3 className="mb-2" style={{ color: 'var(--text-primary)' }}>{tier.name}</h3>
                    <p className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {tier.price}
                      {tier.period && (
                        <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>{tier.period}</span>
                      )}
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{tier.desc}</p>
                    <ul className="space-y-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
                      {tier.features.map((f) => (
                        <li key={f} className="text-sm">{f}</li>
                      ))}
                    </ul>
                    <a
                      className="block w-full py-2 rounded-lg text-sm font-medium text-center transition-opacity duration-150 hover:opacity-90 active:scale-[0.97]"
                      style={{
                        backgroundColor: tier.primary ? 'var(--color-primary)' : 'transparent',
                        color: tier.primary ? 'var(--bg)' : 'var(--text-primary)',
                        border: tier.primary ? 'none' : `1px solid var(--border)`,
                      }}
              href="/dashboard"
                    >
                      {tier.price === 'Custom' ? 'Contact Sales' : 'Start Free'}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* CTA */}
        <Reveal>
          <section
            className="px-6 py-20 border-t"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl mb-4" style={{ color: 'var(--text-primary)' }}>Your next AWS bill doesn&apos;t have to be a surprise</h2>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Connect your account. See your first anomaly in 5 minutes. No credit card, no sales call.
              </p>
              <a
                className="inline-block px-8 py-3 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90 active:scale-[0.97]"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--bg)',
                }}
                href="/dashboard"
              >
                Start Free Trial
              </a>
            </div>
          </section>
        </Reveal>
      </main>

      <footer
        className="px-6 py-8 border-t"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-4">
            <span>© 2026 CostWatch</span>
            <span className="hidden md:inline">·</span>
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors duration-150">Privacy</a>
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors duration-150">Terms</a>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--success)' }}></span>
              All systems operational
            </span>
            <span className="hidden md:inline">·</span>
            <a href="#" className="hover:text-[var(--text-secondary)] transition-colors duration-150">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

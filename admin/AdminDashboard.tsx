import { useCallback, useEffect, useState } from 'react'
import { AdminEmailsTab } from './AdminEmailsTab'
import { AdminEventsTab } from './AdminEventsTab'
import { AdminOpsTab } from './AdminOpsTab'
import { AdminOverviewTab } from './AdminOverviewTab'
import { AdminToast, useAdminToast } from './AdminToast'
import { AdminUserDetail } from './AdminUserDetail'
import { AdminUsersTab } from './AdminUsersTab'
import {
  fetchAdminUsers,
  fetchAnalyticsSummary,
  fetchCombinedEmails,
  fetchEmailSignups,
  fetchRecentEvents,
} from './analyticsApi'
import type { AdminTabId, AdminUserRow, AnalyticsSummary, CombinedEmailRow, EmailSignupRow, RecentEventRow } from './types'

const TABS: { id: AdminTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'emails', label: 'Emails' },
  { id: 'events', label: 'Events' },
  { id: 'ops', label: 'Ops' },
]

type Props = {
  adminSecret: string
}

export function AdminDashboard({ adminSecret }: Props) {
  const { toast, showToast } = useAdminToast()
  const [tab, setTab] = useState<AdminTabId>('overview')

  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const [emailsLoading, setEmailsLoading] = useState(false)
  const [emailsError, setEmailsError] = useState<string | null>(null)
  const [signups, setSignups] = useState<EmailSignupRow[]>([])
  const [combinedEmails, setCombinedEmails] = useState<CombinedEmailRow[]>([])

  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [events, setEvents] = useState<RecentEventRow[]>([])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      setSummary(await fetchAnalyticsSummary(adminSecret, 30))
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to load analytics')
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [adminSecret])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      setUsers(await fetchAdminUsers(adminSecret))
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [adminSecret])

  const loadEmails = useCallback(async () => {
    setEmailsLoading(true)
    setEmailsError(null)
    try {
      const [signupRows, combinedRows] = await Promise.all([
        fetchEmailSignups(adminSecret),
        fetchCombinedEmails(adminSecret),
      ])
      setSignups(signupRows)
      setCombinedEmails(combinedRows)
    } catch (err) {
      setEmailsError(err instanceof Error ? err.message : 'Failed to load emails')
      setSignups([])
      setCombinedEmails([])
    } finally {
      setEmailsLoading(false)
    }
  }, [adminSecret])

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      setEvents(await fetchRecentEvents(adminSecret, 100))
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to load events')
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }, [adminSecret])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (tab === 'users') void loadUsers()
    if (tab === 'emails') void loadEmails()
    if (tab === 'events') void loadEvents()
  }, [tab, loadUsers, loadEmails, loadEvents])

  const subcopy: Record<AdminTabId, string> = {
    overview: 'aggregate telemetry · charts',
    users: 'live account roster · per-user ops',
    emails: 'waitlist + combined mailing list',
    events: 'latest play feed · no table editor',
    ops: 'danger zone · orphan sweep',
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div>
          <p className="admin-header__eyebrow">cult.18 · mothership</p>
          <h1>ALIWORLD control panel</h1>
          <p className="admin-header__sub">{subcopy[tab]}</p>
        </div>
        {tab === 'overview' ? (
          <button
            type="button"
            className="admin-refresh"
            onClick={() => void loadSummary()}
            disabled={summaryLoading}
          >
            {summaryLoading ? 'Loading…' : 'Refresh'}
          </button>
        ) : null}
      </header>

      <nav className="admin-tabs" aria-label="Dashboard sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`admin-tabs__btn${tab === id ? ' admin-tabs__btn--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <AdminOverviewTab loading={summaryLoading} error={summaryError} summary={summary} />
      ) : null}

      {tab === 'users' ? (
        <AdminUsersTab
          rows={users}
          loading={usersLoading}
          error={usersError}
          onRefresh={() => void loadUsers()}
          onSelectUser={setSelectedUserId}
        />
      ) : null}

      {tab === 'emails' ? (
        <AdminEmailsTab
          adminSecret={adminSecret}
          signups={signups}
          combined={combinedEmails}
          loading={emailsLoading}
          error={emailsError}
          onRefresh={() => void loadEmails()}
          showToast={showToast}
        />
      ) : null}

      {tab === 'events' ? (
        <AdminEventsTab
          rows={events}
          loading={eventsLoading}
          error={eventsError}
          onRefresh={() => void loadEvents()}
        />
      ) : null}

      {tab === 'ops' ? (
        <AdminOpsTab
          adminSecret={adminSecret}
          onEventsCleared={() => {
            void loadSummary()
            void loadEvents()
          }}
          showToast={showToast}
        />
      ) : null}

      {selectedUserId ? (
        <AdminUserDetail
          adminSecret={adminSecret}
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onChanged={() => void loadUsers()}
          showToast={showToast}
        />
      ) : null}

      <AdminToast message={toast} />

      <footer className="admin-footer">
        Edge function <code>analytics-summary</code> · service role never in browser
      </footer>
    </div>
  )
}

import { useSyncExternalStore } from 'react'
import {
  getAccountSaveStatus,
  subscribeAccountSaveStatus,
  type AccountSaveStatus,
} from '../store/playerStore'
import './AccountSaveIndicator.css'

const STATUS_LABEL: Record<Exclude<AccountSaveStatus, 'idle'>, string> = {
  saving: 'saving…',
  offline: 'offline, will retry',
}

export function AccountSaveIndicator() {
  const status = useSyncExternalStore(
    subscribeAccountSaveStatus,
    getAccountSaveStatus,
    getAccountSaveStatus,
  )

  if (status === 'idle') return null

  return (
    <div className="account-save-indicator" role="status" aria-live="polite">
      {STATUS_LABEL[status]}
    </div>
  )
}

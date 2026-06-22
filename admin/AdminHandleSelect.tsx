import { useMemo } from 'react'
import type { AdminUserRow } from './types'

type Props = {
  value: string
  onChange: (handle: string) => void
  users: readonly AdminUserRow[]
  loading?: boolean
  id?: string
}

export function AdminHandleSelect({ value, onChange, users, loading = false, id }: Props) {
  const options = useMemo(
    () =>
      users
        .filter((row): row is AdminUserRow & { handle: string } => Boolean(row.handle?.trim()))
        .slice()
        .sort((a, b) => a.handle.localeCompare(b.handle)),
    [users],
  )

  return (
    <select
      id={id}
      className="admin-modal__input"
      value={value}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{loading ? 'loading handles…' : 'select handle'}</option>
      {options.map((row) => (
        <option key={row.user_id} value={row.handle.toLowerCase()}>
          @{row.handle} · {row.build_name} · lvl {row.level}
        </option>
      ))}
    </select>
  )
}

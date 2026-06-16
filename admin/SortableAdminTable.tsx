import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { compareNumbers, compareStrings } from './useSortableRows'

export type ColumnDef<T> = {
  key: keyof T & string
  label: string
  align?: 'left' | 'right'
  render?: (row: T) => ReactNode
  compare?: (a: T, b: T) => number
}

type SortableTableProps<T extends Record<string, unknown>> = {
  label: string
  rows: T[]
  columns: ColumnDef<T>[]
  defaultSortKey: keyof T & string
  defaultSortDir?: 'asc' | 'desc'
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function SortableAdminTable<T extends Record<string, unknown>>({
  label,
  rows,
  columns,
  defaultSortKey,
  defaultSortDir = 'desc',
  getRowKey,
  onRowClick,
  emptyMessage = 'No rows.',
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T & string>(defaultSortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey)
    const copy = [...rows]
    copy.sort((a, b) => {
      const cmp = col?.compare
        ? col.compare(a, b)
        : (() => {
            const av = a[sortKey]
            const bv = b[sortKey]
            if (typeof av === 'number' && typeof bv === 'number') return compareNumbers(av, bv)
            return compareStrings(String(av ?? ''), String(bv ?? ''))
          })()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, columns, sortKey, sortDir])

  function toggleSort(key: keyof T & string) {
    setSortKey(key)
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'))
  }

  function sortIndicator(key: string): string {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  if (rows.length === 0) {
    return <p className="admin-empty">{emptyMessage}</p>
  }

  return (
    <div className="admin-table-wrap">
      <table className={`admin-table${onRowClick ? ' admin-table--clickable' : ''}`} aria-label={label}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'admin-table__num' : undefined}>
                <button
                  type="button"
                  className="admin-table__sort"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  {sortIndicator(col.key)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={getRowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'admin-table__num' : undefined}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function useMetricTableSort<T extends Record<string, unknown>>(
  rows: T[],
  defaultKey: keyof T & string,
) {
  const [sortKey, setSortKey] = useState<keyof T & string>(defaultKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? compareNumbers(av, bv)
          : compareStrings(String(av ?? ''), String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir])

  const toggleSort = useCallback((key: string) => {
    setSortKey(key as keyof T & string)
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'))
  }, [sortKey])

  const sortIndicator = useCallback(
    (key: string) => (sortKey !== key ? '' : sortDir === 'asc' ? ' ↑' : ' ↓'),
    [sortKey, sortDir],
  )

  return { sorted, toggleSort, sortIndicator }
}

export function SortableMetricTableHead({
  columns,
  toggleSort,
  sortIndicator,
}: {
  columns: { key: string; label: string; align?: 'left' | 'right' }[]
  toggleSort: (key: string) => void
  sortIndicator: (key: string) => string
}) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col.key} className={col.align === 'right' ? 'admin-table__num' : undefined}>
            <button type="button" className="admin-table__sort" onClick={() => toggleSort(col.key)}>
              {col.label}
              {sortIndicator(col.key)}
            </button>
          </th>
        ))}
      </tr>
    </thead>
  )
}

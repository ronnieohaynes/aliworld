import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

type SortState<K extends string> = {
  key: K
  dir: SortDir
}

export function useSortableRows<T, K extends string>(
  rows: T[],
  defaultKey: K,
  defaultDir: SortDir = 'desc',
  compare: (a: T, b: T, key: K) => number,
) {
  const [sort, setSort] = useState<SortState<K>>({ key: defaultKey, dir: defaultDir })

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const cmp = compare(a, b, sort.key)
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sort, compare])

  function toggleSort(key: K) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' },
    )
  }

  function sortIndicator(key: K): string {
    if (sort.key !== key) return ''
    return sort.dir === 'asc' ? ' ↑' : ' ↓'
  }

  return { sorted, toggleSort, sortIndicator, sort }
}

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function compareNumbers(a: number, b: number): number {
  return a - b
}

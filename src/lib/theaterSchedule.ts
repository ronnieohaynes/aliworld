import {
  PREMIERE_SLOT_DURATION_MS,
  type TheaterPremiere,
  THEATER_PREMIERES,
} from '../data/theaterPremieres'

export type PremiereSlotWindow = {
  premiere: TheaterPremiere
  slotIndex: number
  startsAt: Date
  endsAt: Date
}

export type TheaterScheduleState =
  | { kind: 'live'; window: PremiereSlotWindow }
  | { kind: 'between'; premiere: TheaterPremiere; nextSlot: Date }
  | { kind: 'idle' }

function parseUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function parseSlotTimeUtc(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((v) => Number.parseInt(v, 10))
  const d = new Date(day.getTime())
  d.setUTCHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

function premiereRunEnd(premiere: TheaterPremiere): Date {
  const start = parseUtcDate(premiere.startDate)
  return addDaysUtc(start, premiere.durationDays)
}

export function isPremiereRunActive(premiere: TheaterPremiere, now = new Date()): boolean {
  const start = parseUtcDate(premiere.startDate)
  const end = premiereRunEnd(premiere)
  return now >= start && now < end
}

/** All slot windows for a premiere within its run. */
export function allPremiereSlots(premiere: TheaterPremiere): PremiereSlotWindow[] {
  const out: PremiereSlotWindow[] = []
  const startDay = parseUtcDate(premiere.startDate)
  for (let d = 0; d < premiere.durationDays; d++) {
    const day = addDaysUtc(startDay, d)
    premiere.slotTimesUtc.forEach((time, slotIndex) => {
      const startsAt = parseSlotTimeUtc(day, time)
      out.push({
        premiere,
        slotIndex,
        startsAt,
        endsAt: new Date(startsAt.getTime() + PREMIERE_SLOT_DURATION_MS),
      })
    })
  }
  return out
}

export function findLivePremiereSlot(now = new Date()): PremiereSlotWindow | null {
  for (const premiere of THEATER_PREMIERES) {
    if (!isPremiereRunActive(premiere, now)) continue
    for (const slot of allPremiereSlots(premiere)) {
      if (now >= slot.startsAt && now < slot.endsAt) return slot
    }
  }
  return null
}

export function findNextPremiereSlot(now = new Date()): PremiereSlotWindow | null {
  let best: PremiereSlotWindow | null = null
  for (const premiere of THEATER_PREMIERES) {
    if (!isPremiereRunActive(premiere, now) && now < parseUtcDate(premiere.startDate)) {
      const first = allPremiereSlots(premiere)[0]
      if (first && (!best || first.startsAt < best.startsAt)) best = first
      continue
    }
    if (!isPremiereRunActive(premiere, now)) continue
    for (const slot of allPremiereSlots(premiere)) {
      if (slot.startsAt <= now) continue
      if (!best || slot.startsAt < best.startsAt) best = slot
    }
  }
  return best
}

export function getTheaterScheduleState(now = new Date()): TheaterScheduleState {
  const live = findLivePremiereSlot(now)
  if (live) return { kind: 'live', window: live }

  const next = findNextPremiereSlot(now)
  if (next) return { kind: 'between', premiere: next.premiere, nextSlot: next.startsAt }

  return { kind: 'idle' }
}

export function formatNextSlotLocal(iso: Date): string {
  return iso.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

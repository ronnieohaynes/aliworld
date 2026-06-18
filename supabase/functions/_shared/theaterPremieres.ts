/** Server-side premiere config, keep in sync with src/data/theaterPremieres.ts */

export const PREMIERE_ATTEND_THRESHOLD_SEC = 45
export const PREMIERE_SLOT_DURATION_MS = 90 * 60 * 1000

export type TheaterPremiere = {
  id: string
  title: string
  youtubeId: string
  startDate: string
  durationDays: number
  slotTimesUtc: readonly [string, string, string, string]
  rewardXp: number
  rewardPrints: number
  eventSkinVariantId?: string
  loyaltySealHook?: string
}

export const THEATER_PREMIERES: readonly TheaterPremiere[] = [
  {
    id: 'premiere-drop-01',
    title: 'better luck next time? (live cut)',
    youtubeId: 'dQw4w9WgXcQ',
    startDate: '2026-05-26',
    durationDays: 60,
    slotTimesUtc: ['16:00', '20:00', '00:00', '04:00'],
    rewardXp: 180,
    rewardPrints: 25,
    eventSkinVariantId: 'danny-ali',
    loyaltySealHook: 'theater-premiere-01',
  },
]

export function getPremiereById(id: string): TheaterPremiere | undefined {
  return THEATER_PREMIERES.find((p) => p.id === id)
}

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

function isPremiereRunActive(premiere: TheaterPremiere, now: Date): boolean {
  const start = parseUtcDate(premiere.startDate)
  const end = addDaysUtc(start, premiere.durationDays)
  return now >= start && now < end
}

export type PremiereSlotWindow = {
  premiere: TheaterPremiere
  slotIndex: number
  startsAt: Date
  endsAt: Date
}

function allPremiereSlots(premiere: TheaterPremiere): PremiereSlotWindow[] {
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

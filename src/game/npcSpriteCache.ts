import { loadStoryIdleSheet, type StoryIdlePoses } from './npcIdleSprites'

export type CachedStoryIdle = {
  image: HTMLImageElement
  poses: StoryIdlePoses
}

const stripImageBySrc = new Map<string, HTMLImageElement>()
const storyIdleBySrc = new Map<string, CachedStoryIdle>()
const inflight = new Map<string, Promise<unknown>>()

function isImageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0
}

function loadStripImage(src: string): Promise<HTMLImageElement | null> {
  const cached = stripImageBySrc.get(src)
  if (cached && isImageReady(cached)) return Promise.resolve(cached)

  const key = `strip:${src}`
  const pending = inflight.get(key) as Promise<HTMLImageElement | null> | undefined
  if (pending) return pending

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = stripImageBySrc.get(src) ?? new Image()
    stripImageBySrc.set(src, img)

    const finish = () => {
      resolve(isImageReady(img) ? img : null)
    }

    if (isImageReady(img)) {
      finish()
      return
    }

    img.onload = finish
    img.onerror = () => resolve(null)
    img.src = src
  }).finally(() => {
    inflight.delete(key)
  })

  inflight.set(key, promise)
  return promise
}

export function ensureStoryIdleCached(src: string): Promise<CachedStoryIdle | null> {
  const cached = storyIdleBySrc.get(src)
  if (cached) return Promise.resolve(cached)

  const key = `story:${src}`
  const pending = inflight.get(key) as Promise<CachedStoryIdle | null> | undefined
  if (pending) return pending

  const promise = loadStoryIdleSheet(src)
    .then((loaded) => {
      if (!loaded) return null
      storyIdleBySrc.set(src, loaded)
      return loaded
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

/** Point npc id at cached strip image; loads src once globally. */
export function assignStripSpriteToNpc(
  npcId: string,
  src: string,
  npcSprites: Map<string, HTMLImageElement>,
): Promise<void> {
  const cached = stripImageBySrc.get(src)
  if (cached && isImageReady(cached)) {
    npcSprites.set(npcId, cached)
    return Promise.resolve()
  }

  return loadStripImage(src).then((img) => {
    if (img) npcSprites.set(npcId, img)
  })
}

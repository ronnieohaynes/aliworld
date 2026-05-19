import { DALY_CITY_MAP_SRC } from '../constants/worldAssets'
import { loadImage } from './loadImage'

let mapImage: HTMLImageElement | null = null
let loadPromise: Promise<HTMLImageElement> | null = null

export function loadWorldBackground(): Promise<HTMLImageElement> {
  if (loadPromise) return loadPromise

  loadPromise = loadImage(DALY_CITY_MAP_SRC).then((img) => {
    mapImage = img
    return img
  })

  return loadPromise
}

export function getWorldBackground(): HTMLImageElement | null {
  return mapImage
}

export function isWorldBackgroundLoaded(): boolean {
  return mapImage !== null && mapImage.complete && mapImage.naturalWidth > 0
}

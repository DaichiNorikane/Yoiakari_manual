"use client"
import { Place, SectionData, SectionKey, TaskItem, EquipmentItem } from '@/types'
import { fetchSharedDoc, saveSharedDoc, isSharedEnabled } from '@/lib/supabase'

const STORAGE_KEY = 'yoi_places_v1'

// simple subscriber model for client updates
type Listener = (places: Place[]) => void
const listeners = new Set<Listener>()

export function subscribePlaces(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(places: Place[]) {
  listeners.forEach((fn) => {
    try { fn(places) } catch {}
  })
}

export function loadPlaces(): Place[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Place[]
  } catch {
    return []
  }
}

export function savePlaces(places: Place[], opts?: { skipRemote?: boolean }) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(places))
  // best-effort remote sync
  if (isSharedEnabled && !opts?.skipRemote) {
    // no await to keep UI responsive
    // structure: { version: 1, places }
    void saveSharedDoc({ version: 1, places })
  }
  notify(places)
}

// Async loaders for shared mode
export async function loadPlacesAsync(): Promise<Place[]> {
  if (!isSharedEnabled) return loadPlaces()
  const remote = await fetchSharedDoc<{ version: number; places: Place[] }>()
  if (remote && Array.isArray(remote.places)) {
    savePlaces(remote.places, { skipRemote: true }) // update local cache only
    return remote.places
  }
  // no remote doc yet: seed from local if any
  const local = loadPlaces()
  if (local.length) {
    await saveSharedDoc({ version: 1, places: local })
  }
  return local
}

export function createEmptySections(): Record<SectionKey, SectionData> {
  return {
    equipment: { text: '', images: [], equipments: [] },
    tasks: { text: '', images: [], tasks: [] },
    wiring: { text: '', images: [] },
    teardown: { text: '', images: [] },
  }
}

export function createPlace(name: string): Place {
  return {
    id: crypto.randomUUID(),
    name,
    sections: createEmptySections(),
  }
}

export function upsertPlace(place: Place) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === place.id)
  if (idx >= 0) list[idx] = place
  else list.push(place)
  savePlaces(list)
}

export function renamePlace(id: string, name: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx >= 0) {
    list[idx].name = name
    savePlaces(list)
  }
}

export function deletePlace(id: string) {
  const list = loadPlaces().filter(p => p.id !== id)
  savePlaces(list)
}

export function getPlace(id: string): Place | undefined {
  return loadPlaces().find(p => p.id === id)
}

export async function getPlaceAsync(id: string): Promise<Place | undefined> {
  const list = await loadPlacesAsync()
  return list.find(p => p.id === id)
}

export function updateSectionText(id: string, key: SectionKey, text: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  list[idx].sections[key].text = text
  savePlaces(list)
}

export async function addImages(id: string, key: SectionKey, files: File[]) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return

  const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  for (const f of files) {
    const dataUrl = await toDataUrl(f)
    list[idx].sections[key].images.push({ id: crypto.randomUUID(), name: f.name, dataUrl })
  }
  savePlaces(list)
}

export function removeImage(id: string, key: SectionKey, imageId: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[key]
  sec.images = sec.images.filter(img => img.id !== imageId)
  savePlaces(list)
}

// ---- Tasks helpers ----
export function addTask(id: string, text: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['tasks']
  if (!sec.tasks) sec.tasks = []
  const item: TaskItem = { id: crypto.randomUUID(), text, done: false }
  sec.tasks.push(item)
  savePlaces(list)
}

// ---- Equipment helpers ----
export function addEquipment(id: string, text: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) sec.equipments = []
  const item: EquipmentItem = { id: crypto.randomUUID(), text }
  sec.equipments.push(item)
  savePlaces(list)
}

export function updateEquipmentText(id: string, equipmentId: string, text: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  const e = sec.equipments.find(e => e.id === equipmentId)
  if (!e) return
  e.text = text
  savePlaces(list)
}

export function removeEquipment(id: string, equipmentId: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  sec.equipments = sec.equipments.filter(e => e.id !== equipmentId)
  savePlaces(list)
}

export function toggleTask(id: string, taskId: string, done: boolean) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['tasks']
  if (!sec.tasks) return
  const t = sec.tasks.find(t => t.id === taskId)
  if (!t) return
  t.done = done
  savePlaces(list)
}

export function updateTaskText(id: string, taskId: string, text: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['tasks']
  if (!sec.tasks) return
  const t = sec.tasks.find(t => t.id === taskId)
  if (!t) return
  t.text = text
  savePlaces(list)
}

export function removeTask(id: string, taskId: string) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['tasks']
  if (!sec.tasks) return
  sec.tasks = sec.tasks.filter(t => t.id !== taskId)
  savePlaces(list)
}

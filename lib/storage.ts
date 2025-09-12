"use client"
import { Place, SectionData, SectionKey, TaskItem, EquipmentItem } from '@/types'
import { fetchSharedDoc, saveSharedDoc, isSharedEnabled } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth'

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[storage] localStorage setItem failed (quota?)', e)
  }
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
    const local = loadPlaces()
    const merged = mergeRemoteWithLocal(remote.places, local)
    try { savePlaces(merged, { skipRemote: true }) } catch {}
    return merged
  }
  // no remote doc yet: seed from local if any
  const local = loadPlaces()
  if (local.length) {
    await saveSharedDoc({ version: 1, places: local })
  }
  return local
}

function mergeRemoteWithLocal(remote: Place[], local: Place[]): Place[] {
  const localMap = new Map(local.map(p => [p.id, p]))
  const keys: SectionKey[] = ['equipment', 'tasks', 'wiring', 'teardown']
  const result: Place[] = remote.map(r => {
    const l = localMap.get(r.id)
    if (!l) return r
    const mergedSections: Record<SectionKey, SectionData> = { ...r.sections }
    for (const k of keys) {
      const rs = r.sections[k]
      const ls = l.sections[k]
      // Prefer larger image set to avoid losing newly added local images due to stale remote
      if (ls?.images && (rs?.images?.length ?? 0) < ls.images.length) {
        mergedSections[k] = { ...rs, images: ls.images }
      }
      // Merge equipment item images as well
      if (k === 'equipment' && rs?.equipments && ls?.equipments) {
        const lMap = new Map(ls.equipments.map(e => [e.id, e]))
        mergedSections[k] = { ...mergedSections[k], equipments: rs.equipments.map(e => {
          const le = lMap.get(e.id)
          if (le?.images && (!e.images || e.images.length < le.images.length)) {
            return { ...e, images: le.images }
          }
          return e
        }) }
      }
    }
    return { ...r, sections: mergedSections }
  })
  // also include local places that don't exist remotely yet
  const remoteIds = new Set(remote.map(p => p.id))
  for (const lp of local) {
    if (!remoteIds.has(lp.id)) result.push(lp)
  }
  return result
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
  if (!isAdmin()) return
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
  if (!isAdmin()) return
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[key]
  sec.images = sec.images.filter(img => img.id !== imageId)
  savePlaces(list)
}

// ---- Tasks helpers ----
export function addTask(id: string, text: string, section: 'tasks' | 'teardown' = 'tasks') {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[section]
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
  if (!isAdmin()) return
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  sec.equipments = sec.equipments.filter(e => e.id !== equipmentId)
  savePlaces(list)
}

export function toggleTask(id: string, taskId: string, done: boolean, section: 'tasks' | 'teardown' = 'tasks') {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  const t = sec.tasks.find(t => t.id === taskId)
  if (!t) return
  t.done = done
  savePlaces(list)
}

export function updateTaskText(id: string, taskId: string, text: string, section: 'tasks' | 'teardown' = 'tasks') {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  const t = sec.tasks.find(t => t.id === taskId)
  if (!t) return
  t.text = text
  savePlaces(list)
}

export function removeTask(id: string, taskId: string, section: 'tasks' | 'teardown' = 'tasks') {
  if (!isAdmin()) return
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  sec.tasks = sec.tasks.filter(t => t.id !== taskId)
  savePlaces(list)
}

export function reorderTasks(
  id: string,
  sourceId: string,
  targetIndex: number,
  section: 'tasks' | 'teardown' = 'tasks'
) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  const from = sec.tasks.findIndex(t => t.id === sourceId)
  if (from < 0) return
  const to = Math.max(0, Math.min(targetIndex, sec.tasks.length - 1))
  if (from === to) return
  const [item] = sec.tasks.splice(from, 1)
  sec.tasks.splice(to, 0, item)
  savePlaces(list)
}

export function moveTask(id: string, taskId: string, direction: 'up' | 'down', section: 'tasks' | 'teardown' = 'tasks') {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  const i = sec.tasks.findIndex(t => t.id === taskId)
  if (i < 0) return
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= sec.tasks.length) return
  const [item] = sec.tasks.splice(i, 1)
  sec.tasks.splice(j, 0, item)
  savePlaces(list)
}

export function moveEquipment(id: string, equipmentId: string, direction: 'up' | 'down') {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  const i = sec.equipments.findIndex(e => e.id === equipmentId)
  if (i < 0) return
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= sec.equipments.length) return
  const [item] = sec.equipments.splice(i, 1)
  sec.equipments.splice(j, 0, item)
  savePlaces(list)
}

export function reorderEquipment(
  id: string,
  sourceId: string,
  targetIndex: number,
) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  const from = sec.equipments.findIndex(e => e.id === sourceId)
  if (from < 0) return
  const to = Math.max(0, Math.min(targetIndex, sec.equipments.length - 1))
  if (from === to) return
  const [item] = sec.equipments.splice(from, 1)
  sec.equipments.splice(to, 0, item)
  savePlaces(list)
}

// ---- Equipment item images ----
export async function addEquipmentImages(placeId: string, equipmentId: string, files: File[]) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === placeId)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  const e = sec.equipments.find(e => e.id === equipmentId)
  if (!e) return

  const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  if (!e.images) e.images = []
  for (const f of files) {
    const dataUrl = await toDataUrl(f)
    e.images.push({ id: crypto.randomUUID(), name: f.name, dataUrl })
  }
  savePlaces(list)
}

export function removeEquipmentImage(placeId: string, equipmentId: string, imageId: string) {
  if (!isAdmin()) return
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === placeId)
  if (idx < 0) return
  const sec = list[idx].sections['equipment']
  if (!sec.equipments) return
  const e = sec.equipments.find(e => e.id === equipmentId)
  if (!e || !e.images) return
  e.images = e.images.filter(img => img.id !== imageId)
  savePlaces(list)
}

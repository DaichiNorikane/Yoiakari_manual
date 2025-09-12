"use client"
import { Place, SectionData, SectionKey, TaskItem, EquipmentItem, ImageItem } from '@/types'
import { fetchSharedDoc, saveSharedDoc, isSharedEnabled, supabase, STORAGE_BUCKET } from '@/lib/supabase'
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
    // best-effort async sync: upload missing images to storage, then save slim JSON
    void syncRemote(places)
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
      // Prefer entries that have URLs; merge counts to avoid losing local adds
      if (ls?.images) {
        const better = pickBetterImages(rs?.images, ls.images)
        mergedSections[k] = { ...rs, images: better }
      }
      // Merge equipment item images as well
      if (k === 'equipment' && rs?.equipments && ls?.equipments) {
        const lMap = new Map(ls.equipments.map(e => [e.id, e]))
        mergedSections[k] = { ...mergedSections[k], equipments: rs.equipments.map(e => {
          const le = lMap.get(e.id)
          if (le?.images) return { ...e, images: pickBetterImages(e.images, le.images) }
          return e
        }) }
      }
      // Merge task item images
      if (k === 'tasks' || k === 'teardown') {
        if (rs?.tasks && ls?.tasks) {
          const lMap = new Map(ls.tasks.map(t => [t.id, t]))
          mergedSections[k] = { ...mergedSections[k], tasks: rs.tasks.map(t => {
            const lt = lMap.get(t.id)
            if (lt?.images) return { ...t, images: pickBetterImages(t.images, lt.images) }
            return t
          }) }
        }
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

function pickBetterImages(remote?: ImageItem[], local?: ImageItem[]): ImageItem[] | undefined {
  if (!remote && !local) return remote
  if (!remote) return local
  if (!local) return remote
  // Prefer images that have url; merge by id
  const map = new Map<string, ImageItem>()
  for (const img of remote) map.set(img.id, img)
  for (const img of local) {
    const prev = map.get(img.id)
    if (!prev) map.set(img.id, img)
    else if (!prev.url && img.url) map.set(img.id, { ...prev, url: img.url })
  }
  return Array.from(map.values())
}

function sanitizeForRemote(places: Place[]): Place[] {
  return places.map(p => ({
    ...p,
    sections: Object.fromEntries(Object.entries(p.sections).map(([k, s]) => {
      const sec = s as SectionData
      const slimImages = sec.images?.map(({ id, name, url }) => ({ id, name, url }))
      const next: SectionData = { ...sec, images: slimImages as any }
      if (sec.equipments) {
        next.equipments = sec.equipments.map(e => ({ ...e, images: e.images?.map(({ id, name, url }) => ({ id, name, url })) as any }))
      }
      if (sec.tasks) {
        next.tasks = sec.tasks.map(t => ({ ...t, images: t.images?.map(({ id, name, url }) => ({ id, name, url })) as any }))
      }
      return [k, next]
    })) as any,
  }))
}

async function uploadBlobToStorage(blob: Blob, filename: string, path: string): Promise<string | null> {
  if (!isSharedEnabled || !supabase) return null
  const key = `${path}/${Date.now()}_${Math.random().toString(36).slice(2)}_${filename}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(key, blob, { upsert: false })
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[storage] upload error', error)
    return null
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key)
  return data.publicUrl
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, b64] = dataUrl.split(',')
    const m = /data:(.*?);base64/.exec(meta)
    const mime = m?.[1] || 'application/octet-stream'
    const bin = atob(b64)
    const len = bin.length
    const arr = new Uint8Array(len)
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: mime })
  } catch {
    return null
  }
}

async function syncRemote(places: Place[]) {
  if (!isSharedEnabled) return
  // Attempt to upload any images that still lack a URL
  for (const p of places) {
    const secKeys: SectionKey[] = ['equipment', 'tasks', 'wiring', 'teardown']
    for (const key of secKeys) {
      const sec = p.sections[key]
      if (sec.images) {
        for (const img of sec.images) {
          if (!img.url && img.dataUrl?.startsWith('data:')) {
            const blob = dataUrlToBlob(img.dataUrl)
            if (blob) {
              const u = await uploadBlobToStorage(blob, img.name, `${p.id}/${key}`)
              if (u) img.url = u
            }
          }
        }
      }
      if (key === 'equipment' && sec.equipments) {
        for (const e of sec.equipments) {
          if (e.images) {
            for (const img of e.images) {
              if (!img.url && img.dataUrl?.startsWith('data:')) {
                const blob = dataUrlToBlob(img.dataUrl)
                if (blob) {
                  const u = await uploadBlobToStorage(blob, img.name, `${p.id}/equipment/${e.id}`)
                  if (u) img.url = u
                }
              }
            }
          }
        }
      }
      if ((key === 'tasks' || key === 'teardown') && sec.tasks) {
        for (const t of sec.tasks) {
          if (t.images) {
            for (const img of t.images) {
              if (!img.url && img.dataUrl?.startsWith('data:')) {
                const blob = dataUrlToBlob(img.dataUrl)
                if (blob) {
                  const u = await uploadBlobToStorage(blob, img.name, `${p.id}/${key}/${t.id}`)
                  if (u) img.url = u
                }
              }
            }
          }
        }
      }
    }
  }
  // Finally, save slimmed JSON
  const slim = sanitizeForRemote(places)
  await saveSharedDoc({ version: 1, places: slim })
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
    let url: string | null = null
    try { url = await uploadBlobToStorage(f, f.name, `${id}/${key}`) } catch {}
    list[idx].sections[key].images.push({ id: crypto.randomUUID(), name: f.name, dataUrl, url: url || undefined })
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

// ---- Task item images ----
export async function addTaskImages(placeId: string, section: 'tasks' | 'teardown', taskId: string, files: File[]) {
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === placeId)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  const t = sec.tasks.find(t => t.id === taskId)
  if (!t) return

  const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  if (!t.images) t.images = []
  for (const f of files) {
    const dataUrl = await toDataUrl(f)
    let url: string | null = null
    try { url = await uploadBlobToStorage(f, f.name, `${placeId}/${section}/${taskId}`) } catch {}
    t.images.push({ id: crypto.randomUUID(), name: f.name, dataUrl, url: url || undefined })
  }
  savePlaces(list)
}

export function removeTaskImage(placeId: string, section: 'tasks' | 'teardown', taskId: string, imageId: string) {
  if (!isAdmin()) return
  const list = loadPlaces()
  const idx = list.findIndex(p => p.id === placeId)
  if (idx < 0) return
  const sec = list[idx].sections[section]
  if (!sec.tasks) return
  const t = sec.tasks.find(t => t.id === taskId)
  if (!t || !t.images) return
  t.images = t.images.filter(img => img.id !== imageId)
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
    let url: string | null = null
    try { url = await uploadBlobToStorage(f, f.name, `${placeId}/equipment/${equipmentId}`) } catch {}
    e.images.push({ id: crypto.randomUUID(), name: f.name, dataUrl, url: url || undefined })
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

export type SectionKey = 'equipment' | 'tasks' | 'wiring' | 'teardown'

export type ImageItem = {
  id: string
  name: string
  dataUrl: string
}

export type TaskItem = {
  id: string
  text: string
  done: boolean
}

export type EquipmentItem = {
  id: string
  text: string
  images?: ImageItem[]
}

export type SectionData = {
  text: string
  images: ImageItem[]
  // tasks セクションのみ使用
  tasks?: TaskItem[]
  // equipment セクションのみ使用
  equipments?: EquipmentItem[]
}

export type Place = {
  id: string
  name: string
  sections: Record<SectionKey, SectionData>
}

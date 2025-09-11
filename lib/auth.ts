"use client"

const ADMIN_KEY = 'yoi_admin_v1'
export const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || ''

type AdminListener = (isAdmin: boolean) => void
const listeners = new Set<AdminListener>()

function readAdmin(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ADMIN_KEY) === '1'
  } catch {
    return false
  }
}

export function isAdmin(): boolean {
  return readAdmin()
}

function writeAdmin(v: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_KEY, v ? '1' : '0')
  listeners.forEach(cb => {
    try { cb(v) } catch {}
  })
}

export function subscribeAdmin(cb: AdminListener) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function loginAdmin(code: string): boolean {
  if (!ADMIN_CODE) {
    // if no code set, disallow enabling for safety
    return false
  }
  if (code === ADMIN_CODE) {
    writeAdmin(true)
    return true
  }
  return false
}

export function logoutAdmin() {
  writeAdmin(false)
}

import { useEffect, useState } from 'react'
export function useAdmin(): boolean {
  const [on, setOn] = useState<boolean>(readAdmin())
  useEffect(() => {
    setOn(readAdmin())
    const unsub = subscribeAdmin(setOn)
    return unsub
  }, [])
  return on
}

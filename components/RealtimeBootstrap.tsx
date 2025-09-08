"use client"
import { useEffect } from 'react'
import { startRealtime } from '@/lib/realtime'

export default function RealtimeBootstrap() {
  useEffect(() => {
    startRealtime()
  }, [])
  return null
}


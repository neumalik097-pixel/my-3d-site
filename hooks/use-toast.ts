"use client"

import { useState, useEffect } from "react"

export type ToastVariant = "default" | "success" | "destructive"

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

let _toasts: ToastMessage[] = []
let _listeners: Array<(t: ToastMessage[]) => void> = []

function emit() {
  _listeners.forEach((l) => l([..._toasts]))
}

export function toast(msg: Omit<ToastMessage, "id">) {
  const id = Math.random().toString(36).slice(2)
  _toasts = [..._toasts, { id, ...msg }]
  emit()
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    emit()
  }, 4000)
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([..._toasts])

  useEffect(() => {
    const listener = (t: ToastMessage[]) => setToasts(t)
    _listeners.push(listener)
    return () => {
      _listeners = _listeners.filter((l) => l !== listener)
    }
  }, [])

  return { toasts }
}

'use client'

import { useEffect, useRef } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useShopSettings } from '@/contexts/ShopSettingsContext'
import type { CustomerMeasurement } from '@/types'

const DUE_SOON_DAYS = 3
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const STORAGE_PREFIX = 'nb-measurement-notified'

type Reminder = {
  measurement: CustomerMeasurement
  title: string
  body: string
  status: 'overdue' | 'today' | 'tomorrow' | 'soon'
}

function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseLocalDate(value?: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function daysUntil(dueDate: Date) {
  return Math.round((dueDate.getTime() - startOfToday().getTime()) / (1000 * 60 * 60 * 24))
}

function buildReminder(measurement: CustomerMeasurement): Reminder | null {
  if (measurement.isDone) return null
  const dueDate = parseLocalDate(measurement.dueDate)
  if (!dueDate) return null

  const diff = daysUntil(dueDate)
  if (diff > DUE_SOON_DAYS) return null

  const label = measurement.label || 'Measurement'
  const customer = measurement.customerName || 'Customer'

  if (diff < 0) {
    return {
      measurement,
      status: 'overdue',
      title: `${customer} measurement overdue`,
      body: `${label} was due ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago.`,
    }
  }

  if (diff === 0) {
    return {
      measurement,
      status: 'today',
      title: `${customer} measurement due today`,
      body: `${label} needs attention today.`,
    }
  }

  if (diff === 1) {
    return {
      measurement,
      status: 'tomorrow',
      title: `${customer} measurement due tomorrow`,
      body: `${label} is due tomorrow.`,
    }
  }

  return {
    measurement,
    status: 'soon',
    title: `${customer} measurement due soon`,
    body: `${label} is due in ${diff} days.`,
  }
}

function notificationKey(reminder: Reminder) {
  const m = reminder.measurement
  return `${STORAGE_PREFIX}:${todayKey()}:${m.id}:${m.dueDate}:${reminder.status}`
}

function wasShown(reminder: Reminder) {
  try {
    return localStorage.getItem(notificationKey(reminder)) === '1'
  } catch {
    return true
  }
}

function markShown(reminder: Reminder) {
  try {
    localStorage.setItem(notificationKey(reminder), '1')
  } catch {
    // Ignore storage failures; the notification has already been shown.
  }
}

async function showReminder(reminder: Reminder) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const customerId = reminder.measurement.customerId
  const url = customerId ? `/customers/${customerId}` : '/customers'
  const options: NotificationOptions = {
    body: reminder.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `measurement-${reminder.measurement.id}-${reminder.status}`,
    data: { url },
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(reminder.title, options)
      return
    } catch {
      // Fall through to the page notification API.
    }
  }

  new Notification(reminder.title, options)
}

function notifyDueMeasurements(measurements: CustomerMeasurement[]) {
  const reminders = measurements
    .map(buildReminder)
    .filter((r): r is Reminder => Boolean(r))
    .filter(reminder => !wasShown(reminder))
    .sort((a, b) => {
      const aDate = parseLocalDate(a.measurement.dueDate)?.getTime() ?? 0
      const bDate = parseLocalDate(b.measurement.dueDate)?.getTime() ?? 0
      return aDate - bDate
    })
    .slice(0, 5)

  reminders.forEach(reminder => {
    markShown(reminder)
    void showReminder(reminder)
  })
}

export default function MeasurementDueNotifications() {
  const { user, loading: authLoading } = useAuth()
  const { notificationEnabled, loading: settingsLoading } = useShopSettings()
  const latestMeasurements = useRef<CustomerMeasurement[]>([])

  useEffect(() => {
    if (authLoading || settingsLoading || !user || !notificationEnabled) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const unsubscribe = onSnapshot(collection(db, 'measurements'), snap => {
      const measurements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerMeasurement))
      latestMeasurements.current = measurements
      notifyDueMeasurements(measurements)
    })

    const intervalId = window.setInterval(() => {
      notifyDueMeasurements(latestMeasurements.current)
    }, CHECK_INTERVAL_MS)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
    }
  }, [authLoading, notificationEnabled, settingsLoading, user])

  return null
}

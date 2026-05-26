'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, type QueryConstraint } from 'firebase/firestore'
import { db } from '@/firebase/config'

export function useFirestoreCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const q = query(collection(db, collectionName), ...constraints)
    const unsubscribe = onSnapshot(
      q,
      snap => {
        setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)))
        setLoading(false)
      },
      err => {
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName])

  return { data, loading, error }
}

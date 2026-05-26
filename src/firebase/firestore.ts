import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from './config'
import type { InventoryItem, Customer, Invoice, Rental, CustomerMeasurement } from '@/types'

// Generic helpers
export function colRef(collectionName: string) {
  return collection(db, collectionName)
}

export function docRef(collectionName: string, id: string) {
  return doc(db, collectionName, id)
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [
        k,
        Array.isArray(v)
          ? v.map(item => (item && typeof item === 'object' ? stripUndefined(item) : item))
          : v && typeof v === 'object'
          ? stripUndefined(v)
          : v,
      ])
  ) as Partial<T>
}

// Inventory
export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt'>) {
  return addDoc(colRef('inventory'), { ...stripUndefined(item), createdAt: serverTimestamp() })
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>) {
  return updateDoc(docRef('inventory', id), stripUndefined(data))
}

export async function deleteInventoryItem(id: string) {
  return deleteDoc(docRef('inventory', id))
}

// Customers
export async function addCustomer(customer: Omit<Customer, 'id'>) {
  return addDoc(colRef('customers'), stripUndefined(customer))
}

export async function updateCustomer(id: string, data: Partial<Customer>) {
  return updateDoc(docRef('customers', id), stripUndefined(data))
}

export async function getCustomerInvoices(customerId: string) {
  const q = query(colRef('invoices'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))
}

// Invoices
export async function addInvoice(invoice: Omit<Invoice, 'id'>) {
  return addDoc(colRef('invoices'), { ...stripUndefined(invoice), createdAt: serverTimestamp() })
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return updateDoc(docRef('invoices', id), stripUndefined(data))
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(docRef('invoices', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Invoice
}

// Rentals
export async function addRental(rental: Omit<Rental, 'id'>) {
  return addDoc(colRef('rentals'), stripUndefined(rental))
}

export async function updateRental(id: string, data: Partial<Rental>) {
  return updateDoc(docRef('rentals', id), stripUndefined(data))
}

// Measurements
export async function addMeasurement(data: Omit<CustomerMeasurement, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(colRef('measurements'), { ...stripUndefined(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function updateMeasurement(id: string, data: Partial<CustomerMeasurement>) {
  return updateDoc(docRef('measurements', id), { ...stripUndefined(data), updatedAt: serverTimestamp() })
}

export async function deleteMeasurement(id: string) {
  return deleteDoc(docRef('measurements', id))
}

export async function getCustomerMeasurements(customerId: string): Promise<CustomerMeasurement[]> {
  try {
    const q = query(colRef('measurements'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerMeasurement))
  } catch {
    const q2 = query(colRef('measurements'), where('customerId', '==', customerId))
    const snap2 = await getDocs(q2)
    return snap2.docs.map(d => ({ id: d.id, ...d.data() } as CustomerMeasurement))
  }
}

// Real-time listeners
export function subscribeToCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
) {
  const q = query(colRef(collectionName), ...constraints)
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
    callback(data)
  })
}

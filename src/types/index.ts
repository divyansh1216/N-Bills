export type ItemCategory =
  | 'lehenga'
  | 'saree'
  | 'sherwani'
  | 'gown'
  | 'blouse'
  | 'suit'
  | 'accessories'
  | 'other'

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial'
export type RentalStatus = 'active' | 'returned' | 'overdue'
export type CustomerTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type ViewMode = 'grid' | 'list'
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit'

export interface InventoryItem {
  id: string
  name: string
  category: ItemCategory
  price: number
  rentalPrice?: number
  deposit?: number
  stock: number
  available: number
  imageUrl?: string
  description?: string
  tags?: string[]
  isRentable: boolean
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  totalSpent: number
  totalOrders: number
  lastVisit: string
  joinedAt: string
  tier: CustomerTier
}

export interface InvoiceLineItem {
  id: string
  itemId: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  type: 'stitching' | 'rental'
  rentalDays?: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone?: string
  items: InvoiceLineItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  status: PaymentStatus
  paymentMethod?: PaymentMethod
  amountPaid?: number
  notes?: string
  createdAt: string
  dueAt?: string
}

export interface Rental {
  id: string
  invoiceId: string
  customerId: string
  customerName: string
  customerPhone?: string
  items: InvoiceLineItem[]
  depositPaid: number
  rentalDate: string
  returnDueDate: string
  returnedDate?: string
  status: RentalStatus
  notes?: string
}

export interface ActivityItem {
  id: string
  type: 'stitching' | 'rental' | 'return' | 'payment'
  description: string
  customerName: string
  amount: number
  timestamp: string
}

export interface ChartDataPoint {
  month: string
  revenue: number
  rentals: number
}

export interface CategoryDataPoint {
  name: string
  value: number
  color: string
}

export type GarmentType = 'blouse'  | 'kurti_salwar' | 'lehenga' | 'lehenga_blouse' | 'gown'
export type MeasurementUnit = 'in' | 'cm'

export interface GarmentMeasurements {
  bust?: number
  waist?: number
  hip?: number
  shoulder?: number
  sleeveLength?: number
  armhole?: number
  neckDepthFront?: number
  neckDepthBack?: number
  neckWidth?: number
  blouseLength?: number
  kurtiLength?: number
  salwarLength?: number
  palazzoLength?: number
  lehengaLength?: number
  gownLength?: number
  bottomWidth?: number
  kneeWidth?: number
  fallLength?: number
  apexPoint?: number
  sleeveRound?: number
  halfBody?: number
  neckShape?: string
  totalItems?: number
  fieldOrder?: string[]
  hiddenFields?: string[]
  notes?: string
  patternImageUrl?: string
  designImageUrls?: string[]
}

export interface CustomerMeasurement {
  id: string
  customerId: string
  customerName: string
  label: string
  garmentType: GarmentType
  unit: MeasurementUnit
  measurements: GarmentMeasurements
  dueDate?: string
  createdAt: any
  updatedAt: any
}

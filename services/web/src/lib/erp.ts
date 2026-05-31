/**
 * ERP API client — covers Invoicing, Purchasing, Sales, Inventory, Accounting.
 *
 * BACKEND ENVELOPE FACTS (do not change this logic without re-reading controllers):
 *   - Invoicing  index  → { data: { data: Invoice[], ... } }   (paginated, wrapped)
 *   - Purchasing index  → { data: PurchaseOrder[], ... }        (paginated, NOT wrapped in data key)
 *   - Sales      index  → { data: SalesOrder[], ... }           (paginated, NOT wrapped in data key)
 *   - Inventory  products index → same as purchasing (raw paginator)
 *   - Inventory  categories index → { data: Category[] }        (array, wrapped)
 *   - Inventory  stockItems index → raw paginator
 *   - Accounting accounts index  → { data: Account[] }          (array, wrapped)
 *   - Accounting journal  index  → { data: { data: Entry[], ...} } (paginated, wrapped)
 *   All store/show/update → { data: record }
 *   Journal store → { data: entry[] }  (batch array)
 *
 * normalizeList() handles both shapes and always returns T[].
 */

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

// ─── Helpers ────────────────────────────────────────────────────────────────

function wid(): string {
  const workspace = useAuthStore.getState().workspace
  if (!workspace) throw new Error('Workspace not loaded')
  return workspace.id
}

/** Extracts records array from any paginator or plain data envelope. */
function normalizeList<T>(res: any): T[] {
  const d = res.data
  if (Array.isArray(d)) return d            // { data: T[] }
  if (d && Array.isArray(d.data)) return d.data  // { data: { data: T[], ... } }
  return []
}

/** Unwraps axios response for a single record: res.data.data or res.data */
function unwrap<T>(res: any): T {
  return res.data?.data ?? res.data
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number       // integer, min 1
  unit_price: number
  tax_rate: number       // default 0
  total: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  workspace_id: string
  invoice_number: string
  status: string
  currency: string
  subtotal: number
  tax_total: number
  total: number
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  billing_address: string | null
  issue_date: string
  due_date: string
  paid_at: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  items: InvoiceItem[]
}

export interface CreateInvoicePayload {
  invoice_number: string
  currency?: string
  customer_name: string
  customer_email?: string
  billing_address?: string
  issue_date: string
  due_date: string
  notes?: string
  items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'total'>[]
}

export interface UpdateInvoicePayload {
  status?: string
  invoice_number?: string
  customer_name?: string
  customer_email?: string | null
  billing_address?: string | null
  due_date?: string
  notes?: string | null
}

// ─── Invoicing ───────────────────────────────────────────────────────────────

export const erpInvoices = {
  list: async (params?: { status?: string; search?: string; per_page?: number }): Promise<Invoice[]> => {
    const res = await api.get(`/workspaces/${wid()}/invoices`, { params })
    return normalizeList<Invoice>(res)
  },

  get: async (id: string): Promise<Invoice> => {
    const res = await api.get(`/workspaces/${wid()}/invoices/${id}`)
    return unwrap<Invoice>(res)
  },

  create: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const res = await api.post(`/workspaces/${wid()}/invoices`, payload)
    return unwrap<Invoice>(res)
  },

  update: async (id: string, payload: UpdateInvoicePayload): Promise<Invoice> => {
    const res = await api.patch(`/workspaces/${wid()}/invoices/${id}`, payload)
    return unwrap<Invoice>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/invoices/${id}`)
  },
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export interface POItem {
  id?: string
  purchase_order_id?: string
  product_id?: string | null
  description: string
  quantity: number       // float, min 0.01
  unit_price: number
  tax_rate: number
  total: number
}

export type POStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'

export interface PurchaseOrder {
  id: string
  workspace_id: string
  order_number: string
  supplier_id: string | null
  supplier_name: string
  supplier_email: string | null
  status: POStatus
  currency: string
  subtotal: number
  tax_total: number
  total: number
  order_date: string
  expected_date: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  items: POItem[]
}

export interface CreatePOPayload {
  supplier_name: string
  supplier_id?: string
  supplier_email?: string
  currency?: string
  order_date?: string
  expected_date?: string
  notes?: string
  items?: Omit<POItem, 'id' | 'purchase_order_id' | 'total'>[]
}

export interface UpdatePOPayload extends Partial<CreatePOPayload> {
  status?: POStatus
}

export const erpPurchaseOrders = {
  list: async (params?: { status?: string; search?: string; per_page?: number }): Promise<PurchaseOrder[]> => {
    const res = await api.get(`/workspaces/${wid()}/purchases/orders`, { params })
    // backend returns raw paginator (no data key wrapper)
    return normalizeList<PurchaseOrder>(res)
  },

  get: async (id: string): Promise<PurchaseOrder> => {
    const res = await api.get(`/workspaces/${wid()}/purchases/orders/${id}`)
    return unwrap<PurchaseOrder>(res)
  },

  create: async (payload: CreatePOPayload): Promise<PurchaseOrder> => {
    const res = await api.post(`/workspaces/${wid()}/purchases/orders`, payload)
    return unwrap<PurchaseOrder>(res)
  },

  update: async (id: string, payload: UpdatePOPayload): Promise<PurchaseOrder> => {
    const res = await api.put(`/workspaces/${wid()}/purchases/orders/${id}`, payload)
    return unwrap<PurchaseOrder>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/purchases/orders/${id}`)
  },
}

// ─── Sales Orders ─────────────────────────────────────────────────────────────

export interface SOItem {
  id?: string
  sales_order_id?: string
  product_id?: string | null
  description: string
  quantity: number       // float, min 0.01
  unit_price: number
  tax_rate: number
  total: number
}

export type SOStatus = 'draft' | 'quotation' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface SalesOrder {
  id: string
  workspace_id: string
  order_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  status: SOStatus
  currency: string
  subtotal: number
  tax_total: number
  total: number
  order_date: string
  expected_date: string | null
  shipping_address: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  items: SOItem[]
}

export interface CreateSOPayload {
  customer_name: string
  customer_id?: string
  customer_email?: string
  currency?: string
  order_date?: string
  expected_date?: string
  shipping_address?: string
  notes?: string
  items?: Omit<SOItem, 'id' | 'sales_order_id' | 'total'>[]
}

export interface UpdateSOPayload extends Partial<CreateSOPayload> {
  status?: SOStatus
}

export const erpSalesOrders = {
  list: async (params?: { status?: string; search?: string; per_page?: number }): Promise<SalesOrder[]> => {
    const res = await api.get(`/workspaces/${wid()}/sales/orders`, { params })
    return normalizeList<SalesOrder>(res)
  },

  get: async (id: string): Promise<SalesOrder> => {
    const res = await api.get(`/workspaces/${wid()}/sales/orders/${id}`)
    return unwrap<SalesOrder>(res)
  },

  create: async (payload: CreateSOPayload): Promise<SalesOrder> => {
    const res = await api.post(`/workspaces/${wid()}/sales/orders`, payload)
    return unwrap<SalesOrder>(res)
  },

  update: async (id: string, payload: UpdateSOPayload): Promise<SalesOrder> => {
    const res = await api.put(`/workspaces/${wid()}/sales/orders/${id}`, payload)
    return unwrap<SalesOrder>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/sales/orders/${id}`)
  },
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryCategory {
  id: string
  workspace_id: string
  parent_id: string | null
  name: string
  description: string | null
  color: string | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  workspace_id: string
  category_id: string | null
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  unit_price: string        // decimal:2 — comes as string from Laravel
  unit: string
  currency: string
  attributes: Record<string, unknown> | null
  created_by: string
  created_at: string
  updated_at: string
  category: InventoryCategory | null
  stock_items: StockItem[]
}

export type StockStatus = 'in_stock' | 'reserved' | 'sold' | 'damaged' | 'expired'

export interface StockItem {
  id: string
  workspace_id: string
  product_id: string
  lot_number: string | null
  serial_number: string | null
  quantity: number
  location: string | null
  expiry_date: string | null
  status: StockStatus
  created_by: string
  created_at: string
  updated_at: string
  product?: Product
}

export const erpInventoryCategories = {
  list: async (): Promise<InventoryCategory[]> => {
    const res = await api.get(`/workspaces/${wid()}/inventory/categories`)
    // returns { data: Category[] }
    return res.data?.data ?? []
  },

  create: async (payload: { name: string; parent_id?: string; description?: string; color?: string }): Promise<InventoryCategory> => {
    const res = await api.post(`/workspaces/${wid()}/inventory/categories`, payload)
    return unwrap<InventoryCategory>(res)
  },

  update: async (id: string, payload: { name?: string; parent_id?: string | null; description?: string; color?: string }): Promise<InventoryCategory> => {
    const res = await api.put(`/workspaces/${wid()}/inventory/categories/${id}`, payload)
    return unwrap<InventoryCategory>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/inventory/categories/${id}`)
  },
}

export const erpProducts = {
  list: async (params?: { search?: string; category_id?: string; per_page?: number }): Promise<Product[]> => {
    const res = await api.get(`/workspaces/${wid()}/inventory/products`, { params })
    // raw paginator
    return normalizeList<Product>(res)
  },

  get: async (id: string): Promise<Product> => {
    const res = await api.get(`/workspaces/${wid()}/inventory/products/${id}`)
    return unwrap<Product>(res)
  },

  create: async (payload: {
    name: string
    category_id?: string
    sku?: string
    barcode?: string
    description?: string
    unit_price?: number
    unit?: string
    currency?: string
    attributes?: string   // must be JSON string
  }): Promise<Product> => {
    const res = await api.post(`/workspaces/${wid()}/inventory/products`, payload)
    return unwrap<Product>(res)
  },

  update: async (id: string, payload: {
    name?: string
    category_id?: string | null
    sku?: string | null
    barcode?: string | null
    description?: string | null
    unit_price?: number
    unit?: string
    currency?: string
    attributes?: string | null
  }): Promise<Product> => {
    const res = await api.patch(`/workspaces/${wid()}/inventory/products/${id}`, payload)
    return unwrap<Product>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/inventory/products/${id}`)
  },
}

export const erpStockItems = {
  list: async (params?: { product_id?: string; status?: StockStatus; per_page?: number }): Promise<StockItem[]> => {
    if (params?.product_id) {
      // backend route: GET /inventory/products/{product}/stock-items
      const res = await api.get(`/workspaces/${wid()}/inventory/products/${params.product_id}/stock-items`, {
        params: { status: params.status, per_page: params.per_page },
      })
      return normalizeList<StockItem>(res)
    }
    // no product_id — return empty; callers must supply product_id for scoped listing
    return []
  },

  create: async (payload: {
    product_id: string
    quantity: number
    lot_number?: string
    serial_number?: string
    location?: string
    expiry_date?: string
    status?: StockStatus
  }): Promise<StockItem> => {
    const res = await api.post(`/workspaces/${wid()}/inventory/stock-items`, payload)
    return unwrap<StockItem>(res)
  },

  update: async (id: string, payload: {
    quantity?: number
    lot_number?: string | null
    serial_number?: string | null
    location?: string | null
    expiry_date?: string | null
    status?: StockStatus
  }): Promise<StockItem> => {
    const res = await api.patch(`/workspaces/${wid()}/inventory/stock-items/${id}`, payload)
    return unwrap<StockItem>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/inventory/stock-items/${id}`)
  },
}

// ─── Accounting ───────────────────────────────────────────────────────────────

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface Account {
  id: string
  workspace_id: string
  code: string
  name: string
  type: AccountType
  description: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  workspace_id: string
  account_id: string
  entry_date: string
  description: string
  debit_amount: number
  credit_amount: number
  reference_type: string | null
  reference_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  account?: Account
}

export interface JournalEntryLine {
  account_id: string
  description: string
  debit_amount: number
  credit_amount: number
}

export const erpAccounts = {
  list: async (params?: { type?: AccountType }): Promise<Account[]> => {
    const res = await api.get(`/workspaces/${wid()}/accounts`, { params })
    return res.data?.data ?? []
  },

  create: async (payload: { code: string; name: string; type: AccountType; description?: string; is_active?: boolean }): Promise<Account> => {
    const res = await api.post(`/workspaces/${wid()}/accounts`, payload)
    return unwrap<Account>(res)
  },

  update: async (id: string, payload: { code?: string; name?: string; type?: AccountType; description?: string | null; is_active?: boolean }): Promise<Account> => {
    const res = await api.patch(`/workspaces/${wid()}/accounts/${id}`, payload)
    return unwrap<Account>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/accounts/${id}`)
  },
}

export const erpJournalEntries = {
  list: async (params?: { from?: string; to?: string; account_id?: string; per_page?: number }): Promise<JournalEntry[]> => {
    const res = await api.get(`/workspaces/${wid()}/journal-entries`, { params })
    // { data: { data: JournalEntry[], ... } }
    const d = res.data?.data
    if (d && Array.isArray(d.data)) return d.data
    if (Array.isArray(d)) return d
    return []
  },

  create: async (payload: {
    entries: JournalEntryLine[]
    entry_date: string
    reference_type?: string
    reference_id?: string
  }): Promise<JournalEntry[]> => {
    const res = await api.post(`/workspaces/${wid()}/journal-entries`, payload)
    return res.data?.data ?? []
  },
}

// ─── Job Cards ────────────────────────────────────────────────────────────────

export type JobCardStatus = 'new' | 'in_progress' | 'completed' | 'signed_off' | 'rejected'
export type JobCardPriority = 'low' | 'medium' | 'high' | 'critical'

export interface JobCardTask {
  id?: string
  job_card_id?: string
  description: string
  is_checked: boolean
  position: number
  category: string
  completed_by?: string | null
  completed_at?: string | null
}

export interface JobCardTimeEntry {
  id?: string
  job_card_id?: string
  user_id: string
  started_at: string
  ended_at?: string | null
  duration_minutes?: number | null
  notes?: string | null
  user?: { id: string; name: string }
}

export interface JobCardAttachment {
  id?: string
  job_card_id?: string
  filename: string
  filepath: string
  mime_type?: string | null
  file_size?: number | null
  category: string
  uploaded_by: string
}

export interface JobCard {
  id: string
  workspace_id: string
  assigned_to: string | null
  client_id: string | null
  title: string
  description: string | null
  status: JobCardStatus
  priority: JobCardPriority
  industry_template: string | null
  location: string | null
  custom_fields: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  signed_off_at: string | null
  signed_off_by: string | null
  signoff_notes: string | null
  rejection_reason: string | null
  created_by: string
  created_at: string
  updated_at: string
  tasks?: JobCardTask[]
  time_entries?: JobCardTimeEntry[]
  attachments?: JobCardAttachment[]
  assigned_to_user?: { id: string; name: string }
  created_by_user?: { id: string; name: string }
}

export interface CreateJobCardPayload {
  title: string
  description?: string | null
  status?: JobCardStatus
  priority?: JobCardPriority
  assigned_to?: string | null
  client_id?: string | null
  industry_template?: string | null
  location?: string | null
  custom_fields?: string | null
  started_at?: string | null
  tasks?: { description: string; category?: string }[]
}

export interface UpdateJobCardPayload {
  title?: string
  description?: string | null
  status?: JobCardStatus
  priority?: JobCardPriority
  assigned_to?: string | null
  client_id?: string | null
  location?: string | null
  custom_fields?: string | null
  started_at?: string | null
  rejection_reason?: string | null
}

export const erpJobCards = {
  list: async (params?: { status?: string; priority?: string; assigned_to?: string; search?: string; per_page?: number }): Promise<JobCard[]> => {
    const res = await api.get(`/workspaces/${wid()}/job-cards`, { params })
    return normalizeList<JobCard>(res)
  },

  get: async (id: string): Promise<JobCard> => {
    const res = await api.get(`/workspaces/${wid()}/job-cards/${id}`)
    return unwrap<JobCard>(res)
  },

  create: async (payload: CreateJobCardPayload): Promise<JobCard> => {
    const res = await api.post(`/workspaces/${wid()}/job-cards`, payload)
    return unwrap<JobCard>(res)
  },

  update: async (id: string, payload: UpdateJobCardPayload): Promise<JobCard> => {
    const res = await api.patch(`/workspaces/${wid()}/job-cards/${id}`, payload)
    return unwrap<JobCard>(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/job-cards/${id}`)
  },

  signOff: async (id: string, notes?: string): Promise<JobCard> => {
    const res = await api.post(`/workspaces/${wid()}/job-cards/${id}/sign-off`, { notes })
    return unwrap<JobCard>(res)
  },

  reject: async (id: string, rejection_reason: string): Promise<JobCard> => {
    const res = await api.post(`/workspaces/${wid()}/job-cards/${id}/reject`, { rejection_reason })
    return unwrap<JobCard>(res)
  },
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(n)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

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

  update: async (id: string, payload: Partial<{ description: string; debit_amount: number; credit_amount: number; entry_date: string }>): Promise<JournalEntry> => {
    const res = await api.patch(`/workspaces/${wid()}/journal-entries/${id}`, payload)
    return unwrap(res)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/journal-entries/${id}`)
  },
}

// ─── Accounting Financial Reports ────────────────────────────────────────────

export interface TrialBalanceEntry {
  account_id: string
  code: string
  name: string
  type: string
  debit: number
  credit: number
  balance: number
}

export interface ProfitLossReport {
  revenue: number
  expenses: number
  net_income: number
  accounts: Array<{ id: string; name: string; type: string; amount: number }>
}

export interface BalanceSheetReport {
  assets: number
  liabilities: number
  equity: number
  total_liabilities_and_equity: number
}

export interface CashFlowReport {
  operating: number
  investing: number
  financing: number
  net_cash_flow: number
}

export const erpFinancialReports = {
  trialBalance: async (): Promise<TrialBalanceEntry[]> => {
    const res = await api.get(`/workspaces/${wid()}/reports/trial-balance`)
    return res.data?.data ?? []
  },
  profitLoss: async (): Promise<ProfitLossReport> => {
    const res = await api.get(`/workspaces/${wid()}/reports/profit-loss`)
    return res.data?.data ?? {}
  },
  balanceSheet: async (): Promise<BalanceSheetReport> => {
    const res = await api.get(`/workspaces/${wid()}/reports/balance-sheet`)
    return res.data?.data ?? {}
  },
  cashFlow: async (): Promise<CashFlowReport> => {
    const res = await api.get(`/workspaces/${wid()}/reports/cash-flow`)
    return res.data?.data ?? {}
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

  // Materials (JOB-10)
  materials: {
    list: async (cardId: string): Promise<JobCardMaterial[]> => {
      const res = await api.get(`/workspaces/${wid()}/job-cards/${cardId}/materials`)
      return res.data?.data ?? []
    },
    add: async (cardId: string, payload: { name: string; quantity: number; unit_price: number; unit?: string; supplier?: string; notes?: string }): Promise<JobCardMaterial> => {
      const res = await api.post(`/workspaces/${wid()}/job-cards/${cardId}/materials`, payload)
      return res.data?.data
    },
    delete: async (cardId: string, materialId: string): Promise<void> => {
      await api.delete(`/workspaces/${wid()}/job-cards/${cardId}/materials/${materialId}`)
    },
  },

  // Tasks / Checklist (JOB-12)
  tasks: {
    add: async (cardId: string, payload: { description: string; category?: string }): Promise<JobCardTask> => {
      const res = await api.post(`/workspaces/${wid()}/job-cards/${cardId}/tasks`, payload)
      return res.data?.data
    },
    toggle: async (cardId: string, taskId: string, is_checked: boolean): Promise<JobCardTask> => {
      const res = await api.patch(`/workspaces/${wid()}/job-cards/${cardId}/tasks/${taskId}`, { is_checked })
      return res.data?.data
    },
    remove: async (cardId: string, taskId: string): Promise<void> => {
      await api.delete(`/workspaces/${wid()}/job-cards/${cardId}/tasks/${taskId}`)
    },
  },

  // Time / Labour (JOB-11)
  timer: {
    start: async (cardId: string): Promise<JobCardTimeEntry> => {
      const res = await api.post(`/workspaces/${wid()}/job-cards/${cardId}/timer/start`)
      return res.data?.data
    },
    stop: async (cardId: string): Promise<JobCardTimeEntry> => {
      const res = await api.post(`/workspaces/${wid()}/job-cards/${cardId}/timer/stop`)
      return res.data?.data
    },
    entries: async (cardId: string): Promise<JobCardTimeEntry[]> => {
      const res = await api.get(`/workspaces/${wid()}/job-cards/${cardId}/time-entries`)
      return res.data?.data ?? []
    },
  },

  // Attachments / Photo (JOB-09)
  attachments: {
    upload: async (cardId: string, file: File, category = 'photo'): Promise<JobCardAttachment> => {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      const res = await api.post(`/workspaces/${wid()}/job-cards/${cardId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data?.data
    },
    delete: async (cardId: string, attachmentId: string): Promise<void> => {
      await api.delete(`/workspaces/${wid()}/job-cards/${cardId}/attachments/${attachmentId}`)
    },
  },
}

export interface JobCardMaterial {
  id: string
  job_card_id: string
  name: string
  unit: string | null
  quantity: number
  unit_price: number
  total: number
  supplier: string | null
  notes: string | null
  created_by: string
}

// ─── Delegation (DEL-01 to DEL-06) ───────────────────────────────────────────

export interface Delegation {
  id: string
  workspace_id: string
  item_id: string
  from_user_id: string
  to_user_id: string
  reason: string
  notes: string | null
  status: 'active' | 'revoked' | 'completed'
  delegated_at: string
  expires_at: string | null
  returned_at: string | null
  accepted_at: string | null
  accepted_by: string | null
  item?: { id: string; title: string }
  from_user?: { id: string; name: string; email: string }
  to_user?: { id: string; name: string; email: string }
}

export const erpDelegation = {
  list: async (params?: { direction?: 'sent' | 'received'; status?: string }): Promise<Delegation[]> => {
    const q = new URLSearchParams()
    if (params?.direction) q.set('direction', params.direction)
    if (params?.status) q.set('status', params.status)
    const res = await api.get(`/workspaces/${wid()}/delegations?${q}`)
    return normalizeList(res)
  },
  delegate: async (boardId: string, itemId: string, toUserId: string, reason: string, expiresAt?: string, key?: string): Promise<Delegation> => {
    const headers: Record<string, string> = { 'Idempotency-Key': key ?? crypto.randomUUID() }
    const res = await api.post(`/workspaces/${wid()}/boards/${boardId}/items/${itemId}/delegate`,
      { to_user_id: toUserId, reason, expires_at: expiresAt ?? null },
      { headers }
    )
    return unwrap(res)
  },
  revoke: async (boardId: string, itemId: string): Promise<Delegation> => {
    const res = await api.delete(`/workspaces/${wid()}/boards/${boardId}/items/${itemId}/delegate`)
    return unwrap(res)
  },
  accept: async (boardId: string, itemId: string, key?: string): Promise<Delegation> => {
    const headers: Record<string, string> = { 'Idempotency-Key': key ?? crypto.randomUUID() }
    const res = await api.post(`/workspaces/${wid()}/boards/${boardId}/items/${itemId}/delegate/accept`, {}, { headers })
    return unwrap(res)
  },
}

// ─── Financial Approval Controls (Floating API) ────────────────────────────

export interface FinancialApproval {
  id: string
  workspace_id: string
  invoice_id: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_by: string
  approved_by: string | null
  notes: string | null
  created_at: string
}

export const erpFinancialApprovals = {
  list: async (): Promise<FinancialApproval[]> => {
    const res = await api.get(`/workspaces/${wid()}/finance/invoice-approvals`)
    return normalizeList(res)
  },
  submit: async (invoiceId: string): Promise<FinancialApproval> => {
    const res = await api.post(`/workspaces/${wid()}/finance/invoices/${invoiceId}/submit-approval`)
    return unwrap(res)
  },
  approve: async (approvalId: string, notes?: string): Promise<FinancialApproval> => {
    const res = await api.post(`/workspaces/${wid()}/finance/invoice-approvals/${approvalId}/approve`, { notes })
    return unwrap(res)
  },
  reject: async (approvalId: string, notes?: string): Promise<FinancialApproval> => {
    const res = await api.post(`/workspaces/${wid()}/finance/invoice-approvals/${approvalId}/reject`, { notes })
    return unwrap(res)
  },
  reverse: async (invoiceId: string, notes?: string): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/finance/invoices/${invoiceId}/reverse`, { notes })
    return unwrap(res)
  },
}

// ─── Report Scheduling (Floating API) ───────────────────────────────────────

export interface ReportSchedule {
  id: string
  workspace_id: string
  name: string
  report_type: string
  frequency: string
  recipients: string[]
  is_active: boolean
  next_run_at: string | null
  last_run_at: string | null
  created_at: string
}

export const erpReportSchedules = {
  list: async (): Promise<ReportSchedule[]> => {
    const res = await api.get(`/workspaces/${wid()}/reports/schedules`)
    return normalizeList(res)
  },
  create: async (payload: Partial<ReportSchedule>): Promise<ReportSchedule> => {
    const res = await api.post(`/workspaces/${wid()}/reports/schedules`, payload)
    return unwrap(res)
  },
  update: async (id: string, payload: Partial<ReportSchedule>): Promise<ReportSchedule> => {
    const res = await api.patch(`/workspaces/${wid()}/reports/schedules/${id}`, payload)
    return unwrap(res)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/reports/schedules/${id}`)
  },
  runNow: async (id: string): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/reports/schedules/${id}/run-now`)
    return unwrap(res)
  },
  exceptions: async (): Promise<unknown[]> => {
    const res = await api.get(`/workspaces/${wid()}/reports/schedules/exceptions`)
    return normalizeList(res)
  },
}

// ─── Goals / OKRs (Floating API) ───────────────────────────────────────────

export interface Goal {
  id: string
  workspace_id: string
  title: string
  description: string | null
  type: string
  target_value: number
  current_value: number
  unit: string | null
  status: string
  owner_id: string
  start_date: string | null
  due_date: string | null
  created_at: string
}

export const erpGoals = {
  list: async (): Promise<Goal[]> => {
    const res = await api.get(`/workspaces/${wid()}/goals`)
    return normalizeList(res)
  },
  create: async (payload: Partial<Goal>): Promise<Goal> => {
    const res = await api.post(`/workspaces/${wid()}/goals`, payload)
    return unwrap(res)
  },
  update: async (id: string, payload: Partial<Goal>): Promise<Goal> => {
    const res = await api.patch(`/workspaces/${wid()}/goals/${id}`, payload)
    return unwrap(res)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/goals/${id}`)
  },
}

// ─── Meeting Outcomes (Floating API) ────────────────────────────────────────

export interface MeetingOutcome {
  id: string
  workspace_id: string
  meeting_id: string
  summary: string
  action_items: string[]
  attendees: string[]
  effectiveness_score: number | null
  created_at: string
}

export const erpMeetingOutcomes = {
  list: async (): Promise<MeetingOutcome[]> => {
    const res = await api.get(`/workspaces/${wid()}/meeting-outcomes`)
    return normalizeList(res)
  },
  create: async (meetingId: string, payload: Partial<MeetingOutcome>): Promise<MeetingOutcome> => {
    const res = await api.post(`/workspaces/${wid()}/meetings/${meetingId}/outcome`, payload)
    return unwrap(res)
  },
  get: async (meetingId: string): Promise<MeetingOutcome> => {
    const res = await api.get(`/workspaces/${wid()}/meetings/${meetingId}/outcome`)
    return unwrap(res)
  },
}

// ─── Email Project Addresses (Floating API) ─────────────────────────────────

export interface EmailProjectAddress {
  id: string
  workspace_id: string
  address: string
  label: string | null
  is_active: boolean
  created_at: string
}

export const erpEmailAddresses = {
  list: async (): Promise<EmailProjectAddress[]> => {
    const res = await api.get(`/workspaces/${wid()}/email/project-addresses`)
    return normalizeList(res)
  },
  create: async (payload: Partial<EmailProjectAddress>): Promise<EmailProjectAddress> => {
    const res = await api.post(`/workspaces/${wid()}/email/project-addresses`, payload)
    return unwrap(res)
  },
  update: async (id: string, payload: Partial<EmailProjectAddress>): Promise<EmailProjectAddress> => {
    const res = await api.patch(`/workspaces/${wid()}/email/project-addresses/${id}`, payload)
    return unwrap(res)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/email/project-addresses/${id}`)
  },
}

// ─── Employee Groups (Floating API) ─────────────────────────────────────────

export interface EmployeeGroup {
  id: string
  workspace_id: string
  name: string
  description: string | null
  parent_id: string | null
  head_user_id: string | null
  created_at: string
}

export const erpEmployeeGroups = {
  list: async (): Promise<EmployeeGroup[]> => {
    const res = await api.get(`/workspaces/${wid()}/employee-groups`)
    return normalizeList(res)
  },
  create: async (payload: Partial<EmployeeGroup>): Promise<EmployeeGroup> => {
    const res = await api.post(`/workspaces/${wid()}/employee-groups`, payload)
    return unwrap(res)
  },
  update: async (id: string, payload: Partial<EmployeeGroup>): Promise<EmployeeGroup> => {
    const res = await api.patch(`/workspaces/${wid()}/employee-groups/${id}`, payload)
    return unwrap(res)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/employee-groups/${id}`)
  },
  orgChart: async (): Promise<unknown> => {
    const res = await api.get(`/workspaces/${wid()}/employee-groups/org-chart`)
    return unwrap(res)
  },
}

// ─── Field Permissions (Floating API) ───────────────────────────────────────

export interface FieldPermission {
  id: string
  workspace_id: string
  module: string
  field: string
  roles: string[]
  created_at: string
}

export const erpFieldPermissions = {
  list: async (module?: string): Promise<FieldPermission[]> => {
    const params = module ? { module } : {}
    const res = await api.get(`/workspaces/${wid()}/field-permissions`, { params })
    return normalizeList(res)
  },
  create: async (payload: Partial<FieldPermission>): Promise<FieldPermission> => {
    const res = await api.post(`/workspaces/${wid()}/field-permissions`, payload)
    return unwrap(res)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/field-permissions/${id}`)
  },
  bulk: async (payload: { permissions: Partial<FieldPermission>[] }): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/field-permissions/bulk`, payload)
    return unwrap(res)
  },
}

// ─── Audit Logs (Floating API) ──────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  workspace_id: string
  user_id: string
  action: string
  subject_type: string
  subject_id: string
  properties: Record<string, unknown>
  created_at: string
}

export const erpAuditLogs = {
  list: async (params?: { limit?: number; user_id?: string; module?: string }): Promise<AuditLogEntry[]> => {
    const res = await api.get(`/workspaces/${wid()}/audit-logs`, { params })
    return normalizeList(res)
  },
  export: async (format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/audit-logs/export`, { params: { format }, responseType: 'blob' })
    return res.data
  },
}

// ─── Integration Reliability (Floating API) ─────────────────────────────────

export interface WebhookEvent {
  id: string
  workspace_id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  status: string
  attempts: number
  last_attempt_at: string | null
  created_at: string
}

export const erpWebhookEvents = {
  list: async (): Promise<WebhookEvent[]> => {
    const res = await api.get(`/workspaces/${wid()}/integrations/webhook-events`)
    return normalizeList(res)
  },
  retry: async (id: string): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/integrations/webhook-events/${id}/retry`)
    return unwrap(res)
  },
  replay: async (id: string): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/integrations/webhook-events/${id}/replay-now`)
    return unwrap(res)
  },
}

// ─── Offline Sync (Floating API) ────────────────────────────────────────────

export interface SyncConflict {
  id: string
  workspace_id: string
  entity_type: string
  entity_id: string
  local_version: Record<string, unknown>
  remote_version: Record<string, unknown>
  resolution: string | null
  created_at: string
}

export const erpSyncConflicts = {
  list: async (): Promise<SyncConflict[]> => {
    const res = await api.get(`/workspaces/${wid()}/sync/conflicts`)
    return normalizeList(res)
  },
  resolve: async (id: string, resolution: Record<string, unknown>): Promise<unknown> => {
    const res = await api.patch(`/workspaces/${wid()}/sync/conflicts/${id}`, { resolution })
    return unwrap(res)
  },
  resolveAll: async (): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/sync/conflicts/resolve-all`)
    return unwrap(res)
  },
}

// ─── Document PDFs (Floating API) ───────────────────────────────────────────

export const erpDocumentPdfs = {
  quote: async (id: string): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/documents/quotes/${id}/pdf`, { responseType: 'blob' })
    return res.data
  },
  salesOrder: async (id: string): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/documents/sales-orders/${id}/pdf`, { responseType: 'blob' })
    return res.data
  },
  purchaseOrder: async (id: string): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/documents/purchase-orders/${id}/pdf`, { responseType: 'blob' })
    return res.data
  },
  goodsReceipt: async (id: string): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/documents/goods-receipts/${id}/pdf`, { responseType: 'blob' })
    return res.data
  },
  receipt: async (id: string): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/documents/receipts/${id}/pdf`, { responseType: 'blob' })
    return res.data
  },
  creditNote: async (id: string): Promise<Blob> => {
    const res = await api.get(`/workspaces/${wid()}/documents/credit-notes/${id}/pdf`, { responseType: 'blob' })
    return res.data
  },
}

// ─── AI Floating APIs ───────────────────────────────────────────────────────

export const erpAI = {
  dealSummary: async (dealId: string): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/deal-summary`, { deal_id: dealId })
    return unwrap(res)
  },
  churnRisk: async (contactId: string): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/churn-risk`, { contact_id: contactId })
    return unwrap(res)
  },
  nextAction: async (context: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/next-action`, context)
    return unwrap(res)
  },
  emailCompose: async (params: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/email-compose`, params)
    return unwrap(res)
  },
  dataClean: async (params: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/data-clean`, params)
    return unwrap(res)
  },
  anomalyDetection: async (params: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/anomaly-detection`, params)
    return unwrap(res)
  },
  taskDuration: async (params: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/predictions/task-duration`, params)
    return unwrap(res)
  },
  delayRisk: async (params: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/predictions/delay-risk`, params)
    return unwrap(res)
  },
  okrProgress: async (params: Record<string, unknown>): Promise<unknown> => {
    const res = await api.post(`/workspaces/${wid()}/ai/predictions/okr-progress`, params)
    return unwrap(res)
  },
}

// ─── Sales Order to Invoice (Floating API) ──────────────────────────────────

export const erpSalesOrdersExtra = {
  convertToInvoice: async (soId: string): Promise<Invoice> => {
    const res = await api.post(`/workspaces/${wid()}/sales/orders/${soId}/convert-to-invoice`)
    return unwrap(res)
  },
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

// ─── HR Floating APIs ───────────────────────────────────────────────────────

export interface TimesheetEntry {
  user_id: string
  total_hours: number
  entries: number
}

export interface AttendanceReport {
  user_id: string
  total_entries: number
  completed_shifts: number
}

export interface LeaveCalendarEntry {
  id: string
  user_id: string
  start_date: string
  end_date: string
  type: string
  reason: string
  user?: { id: string; name: string; email: string }
}

export const erpHR = {
  timesheet: async (from?: string, to?: string): Promise<TimesheetEntry[]> => {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to) params.to = to
    const res = await api.get(`/workspaces/${wid()}/hr/timesheet`, { params })
    return Object.values(res.data?.data ?? {})
  },
  attendanceReport: async (from?: string, to?: string): Promise<AttendanceReport[]> => {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to) params.to = to
    const res = await api.get(`/workspaces/${wid()}/hr/attendance/report`, { params })
    return normalizeList(res)
  },
  leaveCalendar: async (from?: string, to?: string): Promise<LeaveCalendarEntry[]> => {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to) params.to = to
    const res = await api.get(`/workspaces/${wid()}/hr/leave/calendar`, { params })
    return normalizeList(res)
  },
}

export function formatCurrency(amount: number | string, currency = 'ZAR'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  const locale = currency === 'ZAR' ? 'en-ZA' : 'en-US'
  const fmt = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(v)
  return isNaN(n) ? fmt(0) : fmt(n)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

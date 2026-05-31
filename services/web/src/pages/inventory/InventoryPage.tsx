import { useState } from 'react'
import { Plus, Trash2, ChevronRight, Search, X, Package, Edit2 } from 'lucide-react'
import {
  useInventoryCategories, useCreateInventoryCategory, useDeleteInventoryCategory,
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useStockItems, useCreateStockItem, useUpdateStockItem, useDeleteStockItem,
} from '@/hooks/useInventory'
import { Product, StockItem, StockStatus, InventoryCategory, formatCurrency, formatDate } from '@/lib/erp'
import StatusBadge from '@/components/erp/StatusBadge'

const STOCK_STATUSES: StockStatus[] = ['in_stock', 'reserved', 'sold', 'damaged', 'expired']

// ─── Stock Items Panel ────────────────────────────────────────────────────────

function StockPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: stockItems = [], isLoading } = useStockItems({ product_id: product.id })
  const createStock  = useCreateStockItem()
  const updateStock  = useUpdateStockItem()
  const deleteStock  = useDeleteStockItem()

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ quantity: 0, lot_number: '', serial_number: '', location: '', expiry_date: '', status: 'in_stock' as StockStatus })

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    await createStock.mutateAsync({
      product_id:    product.id,
      quantity:      addForm.quantity,
      lot_number:    addForm.lot_number || undefined,
      serial_number: addForm.serial_number || undefined,
      location:      addForm.location || undefined,
      expiry_date:   addForm.expiry_date || undefined,
      status:        addForm.status,
    })
    setShowAdd(false)
    setAddForm({ quantity: 0, lot_number: '', serial_number: '', location: '', expiry_date: '', status: 'in_stock' })
  }

  const totalInStock = stockItems.filter((s) => s.status === 'in_stock').reduce((n, s) => n + s.quantity, 0)

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-gray-900 border-l border-gray-800 flex flex-col z-40 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <p className="font-semibold text-gray-100 text-sm">{product.name}</p>
          <p className="text-xs text-gray-500">{product.sku ? `SKU: ${product.sku}` : 'No SKU'} · {totalInStock} in stock</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {/* Product info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Unit Price</span><p className="text-gray-200 font-mono">{formatCurrency(parseFloat(product.unit_price), product.currency)}</p></div>
          <div><span className="text-gray-500">Unit</span><p className="text-gray-200">{product.unit}</p></div>
          {product.description && <div className="col-span-2"><span className="text-gray-500">Description</span><p className="text-gray-300 text-xs mt-0.5">{product.description}</p></div>}
        </div>

        {/* Stock items */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Items</h3>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
              <Plus size={12} />Add Stock
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAddStock} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Quantity *</label>
                  <input required type="number" min={0} value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 0 })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Status</label>
                  <select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value as StockStatus })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
                    {STOCK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Location</label>
                  <input value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Lot #</label>
                  <input value={addForm.lot_number} onChange={(e) => setAddForm({ ...addForm, lot_number: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Serial #</label>
                  <input value={addForm.serial_number} onChange={(e) => setAddForm({ ...addForm, serial_number: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Expiry Date</label>
                  <input type="date" value={addForm.expiry_date} onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-gray-300">Cancel</button>
                <button type="submit" disabled={createStock.isPending}
                  className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
                  {createStock.isPending ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <p className="text-gray-500 text-xs">Loading…</p>
          ) : stockItems.length === 0 ? (
            <p className="text-gray-500 text-xs">No stock items yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {stockItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-800/60 rounded px-3 py-2 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-200 font-medium">{item.quantity}</span>
                      <span className="text-xs text-gray-500">{product.unit}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                      {item.location && <span>{item.location}</span>}
                      {item.lot_number && <span>Lot: {item.lot_number}</span>}
                      {item.expiry_date && <span>Exp: {formatDate(item.expiry_date)}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteStock.mutate(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── New Product Form ─────────────────────────────────────────────────────────

function NewProductModal({ categoryId, onClose }: { categoryId?: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', description: '',
    unit_price: '0', unit: 'pc', currency: 'USD',
    category_id: categoryId ?? '',
  })
  const create = useCreateProduct()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await create.mutateAsync({
      name:        form.name,
      sku:         form.sku || undefined,
      barcode:     form.barcode || undefined,
      description: form.description || undefined,
      unit_price:  parseFloat(form.unit_price) || 0,
      unit:        form.unit,
      currency:    form.currency,
      category_id: form.category_id || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">New Product</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">SKU</label>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Barcode</label>
            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Unit Price</label>
            <input type="number" min={0} step={0.01} value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Unit</label>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={create.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Edit Product Modal ───────────────────────────────────────────────────────

function EditProductModal({ product, categories, onClose }: { product: Product; categories: InventoryCategory[]; onClose: () => void }) {
  const [form, setForm] = useState({
    name:        product.name,
    sku:         product.sku ?? '',
    barcode:     product.barcode ?? '',
    description: product.description ?? '',
    unit_price:  product.unit_price,
    unit:        product.unit,
    currency:    product.currency,
    category_id: product.category_id ?? '',
  })
  const update = useUpdateProduct()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await update.mutateAsync({
      id: product.id,
      payload: {
        name:        form.name,
        sku:         form.sku || null,
        barcode:     form.barcode || null,
        description: form.description || null,
        unit_price:  parseFloat(form.unit_price as unknown as string) || 0,
        unit:        form.unit,
        currency:    form.currency,
        category_id: form.category_id || null,
      },
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">Edit Product</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">SKU</label>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Barcode</label>
            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Unit Price</label>
            <input type="number" min={0} step={0.01} value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value as unknown as string })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Unit</label>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          {categories.length > 0 && (
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-gray-500">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs text-gray-500">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={update.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch]                         = useState('')
  const [selectedProduct, setSelectedProduct]       = useState<Product | null>(null)
  const [showNewProduct, setShowNewProduct]         = useState(false)
  const [editingProduct, setEditingProduct]         = useState<Product | null>(null)
  const [newCatName, setNewCatName]                 = useState('')
  const [addingCat, setAddingCat]                   = useState(false)

  const { data: categories = [] }                   = useInventoryCategories()
  const createCategory                              = useCreateInventoryCategory()
  const deleteCategory                              = useDeleteInventoryCategory()

  const { data: products = [], isLoading }          = useProducts({
    category_id: selectedCategoryId ?? undefined,
    search:      search || undefined,
  })
  const deleteProduct                               = useDeleteProduct()

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    await createCategory.mutateAsync({ name: newCatName })
    setNewCatName('')
    setAddingCat(false)
  }

  return (
    <div className="flex flex-col sm:flex-row h-full">
      {/* Category sidebar */}
      <div className="w-full sm:w-52 border-b sm:border-b-0 sm:border-r border-gray-800 flex flex-col bg-gray-950 shrink-0">
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-800">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</span>
          <button onClick={() => setAddingCat(true)} className="text-gray-500 hover:text-gray-200">
            <Plus size={14} />
          </button>
        </div>

        {addingCat && (
          <form onSubmit={handleAddCategory} className="px-3 py-2 flex gap-1">
            <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              onKeyDown={(e) => { if (e.key === 'Escape') { setAddingCat(false); setNewCatName('') } }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-indigo-500 placeholder-gray-600" />
            <button type="submit" className="text-xs text-indigo-400 hover:text-indigo-300 px-1">Add</button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto py-1 max-h-40 sm:max-h-none">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-800/60 transition-colors ${selectedCategoryId === null ? 'text-indigo-300 bg-gray-800/40' : 'text-gray-400'}`}>
            <Package size={14} />All Products
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="group flex items-center">
              <button
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-800/60 transition-colors ${selectedCategoryId === cat.id ? 'text-indigo-300 bg-gray-800/40' : 'text-gray-400'}`}>
                {cat.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                <span className="truncate">{cat.name}</span>
              </button>
              <button
                onClick={() => deleteCategory.mutate(cat.id)}
                className="opacity-0 group-hover:opacity-100 pr-2 text-gray-600 hover:text-red-400 transition-opacity">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-gray-800 animate-slide-up">
          <div className="glass-card p-2 rounded-lg">
            <p className="text-[10px] text-gray-500">Products</p>
            <p className="text-lg font-bold text-gray-100">{products.length}</p>
          </div>
          <div className="glass-card p-2 rounded-lg">
            <p className="text-[10px] text-gray-500">Categories</p>
            <p className="text-lg font-bold text-indigo-400">{categories.length}</p>
          </div>
          <div className="glass-card p-2 rounded-lg">
            <p className="text-[10px] text-gray-500">Total Stock</p>
            <p className="text-lg font-bold text-emerald-400">{products.reduce((s: number, p: Product) => s + (p.stock_items ?? []).filter((st: StockItem) => st.status === 'in_stock').reduce((n: number, st: StockItem) => n + st.quantity, 0), 0)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <h1 className="text-base font-semibold text-gray-100">
            {selectedCategoryId ? (categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Products') : 'All Products'}
          </h1>
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU…"
              className="bg-gray-800 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-52" />
          </div>
          <button onClick={() => setShowNewProduct(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus size={13} />New Product
          </button>
        </div>

        <div className="flex-1 overflow-auto animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-gray-500 text-sm">No products found</p>
              <button onClick={() => setShowNewProduct(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Add a product</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Name</th>
                   <th className="px-4 py-3 font-medium hidden sm:table-cell">SKU</th>
                   <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                  <th className="px-4 py-3 font-medium text-right">In Stock</th>
                  <th className="px-4 py-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                   const inStock = (product.stock_items ?? []).filter((s: StockItem) => s.status === 'in_stock').reduce((n: number, s: StockItem) => n + s.quantity, 0)
                   return (
                     <tr key={product.id}
                       onClick={() => setSelectedProduct(product)}
                       className={`group border-b border-gray-800/60 hover:bg-gray-800/40 cursor-pointer transition-colors ${selectedProduct?.id === product.id ? 'bg-gray-800/60' : ''}`}>
                       <td className="px-5 py-3">
                         <p className="text-gray-200 font-medium">{product.name}</p>
                         {product.description && <p className="text-gray-500 text-xs truncate max-w-xs">{product.description}</p>}
                       </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{product.sku ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{product.category?.name ?? '—'}</td>
                       <td className="px-4 py-3 text-right font-mono text-gray-200 text-xs">
                         {formatCurrency(parseFloat(product.unit_price), product.currency)}
                       </td>
                       <td className="px-4 py-3 text-right">
                         <span className={`text-xs font-medium ${inStock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{inStock}</span>
                         <span className="text-gray-500 text-xs"> {product.unit}</span>
                       </td>
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={(e) => { e.stopPropagation(); setEditingProduct(product) }}
                             className="text-gray-500 hover:text-gray-200">
                             <Edit2 size={13} />
                           </button>
                           <button
                             onClick={(e) => { e.stopPropagation(); deleteProduct.mutate(product.id) }}
                             className="text-gray-600 hover:text-red-400">
                             <Trash2 size={13} />
                           </button>
                         </div>
                       </td>
                     </tr>
                   )
                 })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock panel */}
      {selectedProduct && (
        <StockPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* New product modal */}
      {showNewProduct && (
        <NewProductModal
          categoryId={selectedCategoryId ?? undefined}
          onClose={() => setShowNewProduct(false)}
        />
      )}

      {/* Edit product modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  )
}

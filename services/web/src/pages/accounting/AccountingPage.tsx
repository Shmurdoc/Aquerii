import { useState, useMemo } from 'react'
import { Plus, Trash2, X, Search, Edit2, Check } from 'lucide-react'
import {
  useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
  useJournalEntries, useCreateJournalEntry,
} from '@/hooks/useAccounting'
import { Account, AccountType, JournalEntry, JournalEntryLine, formatCurrency, formatDate } from '@/lib/erp'

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'text-blue-400',
  liability: 'text-red-400',
  equity:    'text-purple-400',
  income:    'text-emerald-400',
  expense:   'text-amber-400',
}

// ─── New Account Modal ────────────────────────────────────────────────────────

function NewAccountModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as AccountType, description: '', is_active: true })
  const create = useCreateAccount()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({
      code: form.code,
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      is_active: form.is_active,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">New Account</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Code *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="1000"
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="accent-indigo-500" />
            <span className="text-sm text-gray-400">Active</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={create.isPending}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Journal Entry Modal ──────────────────────────────────────────────────────

function NewJournalEntryModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const [date, setDate]  = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
  ])
  const create = useCreateJournalEntry()

  const totalDebit  = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.001

  function updateLine(i: number, field: keyof JournalEntryLine, value: string | number) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function addLine() {
    setLines((prev) => [...prev, { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }])
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLines = lines.filter((l) => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0))
    if (validLines.length < 2) return
    await create.mutateAsync({ entries: validLines, entry_date: date })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="font-semibold text-gray-100">New Journal Entry</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Entry Date *</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 w-48" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_1.5fr_100px_100px_28px] gap-2 text-xs text-gray-500 uppercase tracking-wide px-1">
              <span>Account</span><span>Description</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_100px_100px_28px] gap-2 items-center">
                <select value={line.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-indigo-500">
                  <option value="">Select…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)}
                  placeholder="Description"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
                <input type="number" min={0} step={0.01} value={line.debit_amount || ''}
                  onChange={(e) => updateLine(i, 'debit_amount', parseFloat(e.target.value) || 0)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 text-right font-mono focus:outline-none focus:border-indigo-500" />
                <input type="number" min={0} step={0.01} value={line.credit_amount || ''}
                  onChange={(e) => updateLine(i, 'credit_amount', parseFloat(e.target.value) || 0)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 text-right font-mono focus:outline-none focus:border-indigo-500" />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                  className="text-gray-600 hover:text-red-400 disabled:opacity-30 flex items-center justify-center">
                  <X size={13} />
                </button>
              </div>
            ))}

            {/* Totals row */}
            <div className="grid grid-cols-[1fr_1.5fr_100px_100px_28px] gap-2 px-1 border-t border-gray-800 pt-2">
              <div className="col-span-2 flex items-center gap-2">
                <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                  <Plus size={12} />Add line
                </button>
                {balanced
                  ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Check size={11} />Balanced</span>
                  : <span className="text-xs text-red-400">Unbalanced by {formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                }
              </div>
              <span className="text-right text-xs font-mono text-gray-300 font-semibold">{formatCurrency(totalDebit)}</span>
              <span className="text-right text-xs font-mono text-gray-300 font-semibold">{formatCurrency(totalCredit)}</span>
              <span />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
          <button type="submit" disabled={create.isPending || !balanced}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {create.isPending ? 'Posting…' : 'Post Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'accounts' | 'journal'

export default function AccountingPage() {
  const [tab, setTab]                     = useState<Tab>('accounts')
  const [typeFilter, setTypeFilter]       = useState<AccountType | ''>('')
  const [search, setSearch]               = useState('')
  const [fromDate, setFromDate]           = useState('')
  const [toDate, setToDate]               = useState('')
  const [filterAccountId, setFilterAccId] = useState('')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showNewEntry, setShowNewEntry]     = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editForm, setEditForm]             = useState({ code: '', name: '', type: 'asset' as AccountType, description: '' })

  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts(typeFilter ? { type: typeFilter } : undefined)
  const { data: entries  = [], isLoading: loadingEntries  } = useJournalEntries({
    from:       fromDate || undefined,
    to:         toDate || undefined,
    account_id: filterAccountId || undefined,
  })
  const deleteAccount = useDeleteAccount()
  const updateAccount = useUpdateAccount()

  const filteredAccounts = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
  }, [accounts, search])

  function startEdit(account: Account) {
    setEditingAccount(account)
    setEditForm({ code: account.code, name: account.name, type: account.type, description: account.description ?? '' })
  }

  async function saveEdit() {
    if (!editingAccount) return
    await updateAccount.mutateAsync({
      id: editingAccount.id,
      payload: { code: editForm.code, name: editForm.name, type: editForm.type, description: editForm.description || null },
    })
    setEditingAccount(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-800">
        <div className="flex gap-1 bg-gray-800/60 rounded-lg p-0.5">
          {(['accounts', 'journal'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}>
              {t === 'accounts' ? 'Chart of Accounts' : 'Journal Ledger'}
            </button>
          ))}
        </div>
        <div className="flex-1" />

        {tab === 'accounts' && (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts…"
                className="bg-gray-800 border border-gray-700 rounded pl-8 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-44" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AccountType | '')}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-indigo-500">
              <option value="">All Types</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <button onClick={() => setShowNewAccount(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus size={13} />New Account
            </button>
          </>
        )}

        {tab === 'journal' && (
          <>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
            <span className="text-gray-600 text-xs">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-indigo-500" />
            <select value={filterAccountId} onChange={(e) => setFilterAccId(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-indigo-500 w-44">
              <option value="">All Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
            <button onClick={() => setShowNewEntry(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus size={13} />New Entry
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'accounts' && (
          loadingAccounts ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-gray-500 text-sm">No accounts found</p>
              <button onClick={() => setShowNewAccount(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Add an account</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 group">
                    {editingAccount?.id === account.id ? (
                      <>
                        <td className="px-5 py-2">
                          <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 font-mono w-20 focus:outline-none focus:border-indigo-500" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 w-full focus:outline-none focus:border-indigo-500" />
                        </td>
                        <td className="px-4 py-2">
                          <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as AccountType })}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:outline-none focus:border-indigo-500">
                            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2" colSpan={2}>
                          <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description"
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 w-full focus:outline-none focus:border-indigo-500" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
                            <button onClick={() => setEditingAccount(null)} className="text-gray-500 hover:text-gray-300"><X size={13} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 font-mono text-gray-300 text-xs">{account.code}</td>
                        <td className="px-4 py-3 text-gray-200 font-medium">{account.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium capitalize ${TYPE_COLORS[account.type]}`}>{account.type}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-xs">{account.description ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${account.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(account)} className="text-gray-500 hover:text-gray-200"><Edit2 size={13} /></button>
                            <button onClick={() => deleteAccount.mutate(account.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'journal' && (
          loadingEntries ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-gray-500 text-sm">No journal entries</p>
              <button onClick={() => setShowNewEntry(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Post an entry</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right">Debit</th>
                  <th className="px-4 py-3 font-medium text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-800/60 hover:bg-gray-800/30">
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-3">
                      {entry.account ? (
                        <div>
                          <span className="text-gray-200 text-xs font-medium">{entry.account.name}</span>
                          <span className="text-gray-500 text-xs ml-2 font-mono">{entry.account.code}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs font-mono">{entry.account_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{entry.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {entry.debit_amount > 0
                        ? <span className="text-blue-400">{formatCurrency(entry.debit_amount)}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {entry.credit_amount > 0
                        ? <span className="text-emerald-400">{formatCurrency(entry.credit_amount)}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {showNewAccount  && <NewAccountModal onClose={() => setShowNewAccount(false)} />}
      {showNewEntry    && <NewJournalEntryModal accounts={accounts} onClose={() => setShowNewEntry(false)} />}
    </div>
  )
}

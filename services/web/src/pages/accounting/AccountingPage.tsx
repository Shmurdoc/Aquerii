import { useState, useMemo } from 'react'
import { Plus, Trash2, X, Search, Edit2, Check, XCircle } from 'lucide-react'
import {
  useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
  useJournalEntries, useCreateJournalEntry,
} from '@/hooks/useAccounting'
import { Account, AccountType, JournalEntry, JournalEntryLine, formatCurrency, formatDate, erpFinancialReports, TrialBalanceEntry, ProfitLossReport, BalanceSheetReport, CashFlowReport } from '@/lib/erp'
import { Button, Input, Select, DataTable, type Column, PrintButton } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

const TYPE_COLORS: Record<AccountType, string> = {
  asset:     'text-blue-400',
  liability: 'text-red-400',
  equity:    'text-purple-400',
  income:    'text-emerald-400',
  expense:   'text-amber-400',
}

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
      <form onSubmit={handleSubmit} className="bg-[var(--color-bg-deepest)] border border-[var(--color-glass-border)] rounded-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)]">
          <h2 className="font-semibold text-[var(--color-text-primary)]">New Account</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><XCircle size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Code *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="1000"
                className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-mono" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Type *</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="accent-[var(--color-accent)]" />
            <span className="text-sm text-[var(--color-text-secondary)]">Active</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-[var(--color-glass-border)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={create.isPending}>Create Account</Button>
        </div>
      </form>
    </div>
  )
}

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
      <form onSubmit={handleSubmit} className="bg-[var(--color-bg-deepest)] border border-[var(--color-glass-border)] rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-glass-border)] flex-shrink-0">
          <h2 className="font-semibold text-[var(--color-text-primary)]">New Journal Entry</h2>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" aria-label="Close"><XCircle size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-muted)]">Entry Date *</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] w-48" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_1.5fr_100px_100px_28px] gap-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wide px-1">
              <span>Account</span><span>Description</span><span className="text-right">Debit</span><span className="text-right">Credit</span><span />
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_100px_100px_28px] gap-2 items-center">
                <Select value={line.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)} size="sm" placeholder="Select…">
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </Select>
                <input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)}
                  placeholder="Description"
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]" />
                <input type="number" min={0} step={0.01} value={line.debit_amount || ''}
                  onChange={(e) => updateLine(i, 'debit_amount', parseFloat(e.target.value) || 0)}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-primary)] text-right font-mono focus:outline-none focus:border-[var(--color-accent)]" />
                <input type="number" min={0} step={0.01} value={line.credit_amount || ''}
                  onChange={(e) => updateLine(i, 'credit_amount', parseFloat(e.target.value) || 0)}
                  className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-primary)] text-right font-mono focus:outline-none focus:border-[var(--color-accent)]" />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                  className="text-[var(--color-text-muted)] hover:text-red-400 disabled:opacity-30 flex items-center justify-center">
                  <X size={13} />
                </button>
              </div>
            ))}

            <div className="grid grid-cols-[1fr_1.5fr_100px_100px_28px] gap-2 px-1 border-t border-[var(--color-glass-border)] pt-2">
              <div className="col-span-2 flex items-center gap-2">
                <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-[var(--color-accent-text)] hover:text-[var(--color-accent)]">
                  <Plus size={12} />Add line
                </button>
                {balanced
                  ? <span className="flex items-center gap-1 text-xs text-emerald-400"><Check size={11} />Balanced</span>
                  : <span className="text-xs text-red-400">Unbalanced by {formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                }
              </div>
              <span className="text-right text-xs font-mono text-[var(--color-text-primary)] font-semibold">{formatCurrency(totalDebit)}</span>
              <span className="text-right text-xs font-mono text-[var(--color-text-primary)] font-semibold">{formatCurrency(totalCredit)}</span>
              <span />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-glass-border)] flex justify-end gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={create.isPending || !balanced}>
            Post Entry
          </Button>
        </div>
      </form>
    </div>
  )
}

type Tab = 'accounts' | 'journal' | 'reports'

function ReportsTab() {
  const w = useAuthStore(s => s.workspace?.id)

  const { data: trialBalance, isLoading: loadingTB } = useQuery({
    queryKey: ['trial-balance', w],
    queryFn: () => erpFinancialReports.trialBalance(),
    enabled: !!w,
  })

  const { data: pl, isLoading: loadingPL } = useQuery({
    queryKey: ['profit-loss', w],
    queryFn: () => erpFinancialReports.profitLoss(),
    enabled: !!w,
  })

  const { data: bs, isLoading: loadingBS } = useQuery({
    queryKey: ['balance-sheet', w],
    queryFn: () => erpFinancialReports.balanceSheet(),
    enabled: !!w,
  })

  const { data: cf, isLoading: loadingCF } = useQuery({
    queryKey: ['cash-flow', w],
    queryFn: () => erpFinancialReports.cashFlow(),
    enabled: !!w,
  })

  return (
    <div className="space-y-6">
      {/* Trial Balance */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Trial Balance</h3>
        {loadingTB ? (
          <div className="text-xs text-[var(--color-text-muted)]">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-glass-border)]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Account</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">Debit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">Credit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">Balance</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance?.map((e: TrialBalanceEntry) => (
                  <tr key={e.account_id} className="border-b border-[var(--color-glass-border)]/50">
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-text-secondary)]">{e.code}</td>
                    <td className="px-4 py-2 text-[var(--color-text-primary)]">{e.name}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold">{formatCurrency(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profit & Loss */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Profit & Loss</h3>
        {loadingPL ? (
          <div className="text-xs text-[var(--color-text-muted)]">Loading...</div>
        ) : pl ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Revenue</div>
              <div className="text-lg font-bold text-emerald-400">{formatCurrency(pl.revenue)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Expenses</div>
              <div className="text-lg font-bold text-red-400">{formatCurrency(pl.expenses)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Net Income</div>
              <div className={`text-lg font-bold ${pl.net_income >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(pl.net_income)}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Balance Sheet */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Balance Sheet</h3>
        {loadingBS ? (
          <div className="text-xs text-[var(--color-text-muted)]">Loading...</div>
        ) : bs ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Assets</div>
              <div className="text-lg font-bold text-blue-400">{formatCurrency(bs.assets)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Liabilities</div>
              <div className="text-lg font-bold text-red-400">{formatCurrency(bs.liabilities)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Equity</div>
              <div className="text-lg font-bold text-purple-400">{formatCurrency(bs.equity)}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Cash Flow */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Cash Flow</h3>
        {loadingCF ? (
          <div className="text-xs text-[var(--color-text-muted)]">Loading...</div>
        ) : cf ? (
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Operating</div>
              <div className="text-lg font-bold text-emerald-400">{formatCurrency(cf.operating)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Investing</div>
              <div className="text-lg font-bold text-blue-400">{formatCurrency(cf.investing)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Financing</div>
              <div className="text-lg font-bold text-purple-400">{formatCurrency(cf.financing)}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-glass-border)] p-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-1">Net Cash Flow</div>
              <div className={`text-lg font-bold ${cf.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(cf.net_cash_flow)}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

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

  const journalColumns: Column<JournalEntry>[] = [
    {
      key: 'entry_date',
      header: 'Date',
      sortable: true,
      render: (e) => <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">{formatDate(e.entry_date)}</span>,
    },
    {
      key: 'account',
      header: 'Account',
      render: (e) => e.account ? (
        <div>
          <span className="text-[var(--color-text-primary)] text-xs font-medium">{e.account.name}</span>
          <span className="text-[var(--color-text-muted)] text-xs ml-2 font-mono">{e.account.code}</span>
        </div>
      ) : (
        <span className="text-[var(--color-text-muted)] text-xs font-mono">{e.account_id}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (e) => <span className="text-[var(--color-text-muted)] text-xs">{e.description || '—'}</span>,
    },
    {
      key: 'debit_amount',
      header: 'Debit',
      className: 'text-right',
      render: (e) => e.debit_amount > 0
        ? <span className="font-mono text-xs text-blue-400">{formatCurrency(e.debit_amount)}</span>
        : <span className="text-[var(--color-glass-border)]">—</span>,
    },
    {
      key: 'credit_amount',
      header: 'Credit',
      className: 'text-right',
      render: (e) => e.credit_amount > 0
        ? <span className="font-mono text-xs text-emerald-400">{formatCurrency(e.credit_amount)}</span>
        : <span className="text-[var(--color-glass-border)]">—</span>,
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 border-b border-[var(--color-glass-border)] animate-slide-up">
        <div className="glass-card p-2 rounded-lg">
          <p className="text-[10px] text-[var(--color-text-muted)]">Accounts</p>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{accounts.length}</p>
        </div>
        <div className="glass-card p-2 rounded-lg">
          <p className="text-[10px] text-[var(--color-text-muted)]">Journal Entries</p>
          <p className="text-lg font-bold text-indigo-400">{entries.length}</p>
        </div>
        <div className="glass-card p-2 rounded-lg">
          <p className="text-[10px] text-[var(--color-text-muted)]">Total Debits</p>
          <p className="text-lg font-bold text-blue-400">{formatCurrency(entries.reduce((s: number, e: JournalEntry) => s + (e.debit_amount || 0), 0))}</p>
        </div>
        <div className="glass-card p-2 rounded-lg">
          <p className="text-[10px] text-[var(--color-text-muted)]">Total Credits</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(entries.reduce((s: number, e: JournalEntry) => s + (e.credit_amount || 0), 0))}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-glass-border)] shrink-0">
        <PrintButton label="Accounting" />
        <div className="flex gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-0.5">
          {(['accounts', 'journal', 'reports'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
              {t === 'accounts' ? 'Chart of Accounts' : t === 'journal' ? 'Journal Ledger' : 'Financial Reports'}
            </button>
          ))}
        </div>
        <div className="flex-1" />

        {tab === 'accounts' && (
          <>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts…"
                containerClassName="!mb-0" className="!pl-8 !w-44" />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AccountType | '')}
              containerClassName="!mb-0" className="!w-32" size="sm">
              <option value="">All Types</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
            <Button size="sm" onClick={() => setShowNewAccount(true)}>
              <Plus size={13} /> New Account
            </Button>
          </>
        )}

        {tab === 'journal' && (
          <>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            <span className="text-[var(--color-text-muted)] text-xs">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]" />
            <Select value={filterAccountId} onChange={(e) => setFilterAccId(e.target.value)}
              containerClassName="!mb-0 !w-44" size="sm">
              <option value="">All Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </Select>
            <Button size="sm" onClick={() => setShowNewEntry(true)}>
              <Plus size={13} /> New Entry
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto animate-fade-in">
        {tab === 'accounts' && (
          loadingAccounts ? (
            <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">Loading…</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-sm text-[var(--color-text-muted)]">No accounts found</p>
              <button onClick={() => setShowNewAccount(true)} className="text-xs text-[var(--color-accent-text)] hover:text-[var(--color-accent)]">Add an account</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-glass-border)] text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
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
                  <tr key={account.id} className="border-b border-[var(--color-glass-border)] hover:bg-[var(--color-bg-hover)] group">
                    {editingAccount?.id === account.id ? (
                      <>
                        <td className="px-5 py-2">
                          <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                            className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] font-mono w-20 focus:outline-none focus:border-[var(--color-accent)]" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] w-full focus:outline-none focus:border-[var(--color-accent)]" />
                        </td>
                        <td className="px-4 py-2">
                          <Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as AccountType })}
                            size="sm">
                            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </Select>
                        </td>
                        <td className="px-4 py-2" colSpan={2}>
                          <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description"
                            className="bg-[var(--color-bg-input)] border border-[var(--color-glass-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] w-full focus:outline-none focus:border-[var(--color-accent)]" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
                            <button onClick={() => setEditingAccount(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={13} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 font-mono text-[var(--color-text-secondary)] text-xs">{account.code}</td>
                        <td className="px-4 py-3 text-[var(--color-text-primary)] font-medium">{account.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium capitalize ${TYPE_COLORS[account.type]}`}>{account.type}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs truncate max-w-xs">{account.description ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${account.is_active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(account)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><Edit2 size={13} /></button>
                            <button onClick={() => deleteAccount.mutate(account.id)} className="text-[var(--color-text-muted)] hover:text-red-400"><Trash2 size={13} /></button>
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
          <DataTable
            columns={journalColumns}
            data={entries}
            keyExtractor={(e: JournalEntry) => e.id}
            isLoading={loadingEntries}
            emptyTitle="No journal entries"
            emptyDescription="Post an entry to get started."
          />
        )}

        {tab === 'reports' && <ReportsTab />}
      </div>

      {showNewAccount  && <NewAccountModal onClose={() => setShowNewAccount(false)} />}
      {showNewEntry    && <NewJournalEntryModal accounts={accounts} onClose={() => setShowNewEntry(false)} />}
    </div>
  )
}

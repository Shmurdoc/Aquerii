import { useState, useRef, useEffect } from 'react'
import { useGateScan, type GateScanResult } from '@/lib/gate'
import { scanEquipment } from '@/lib/equipment'
import { Card, Button, Input, Tabs, TabList, Tab, TabPanel } from '@/components/ui'
import { Shield, CheckCircle, XCircle, AlertTriangle, ScanLine, User, Wrench } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { VisitorFlow } from './VisitorFlow'

type EquipScanResult = {
  status: 'compliant' | 'non_compliant'
  equipment: {
    id: string
    name: string
    registration_number: string
    equipment_type: string
  } | null
  non_compliance_reasons: string[]
  scanned_at: string
}

function WorkerScanPanel() {
  const [badgeId, setBadgeId] = useState('')
  const [result, setResult] = useState<GateScanResult | null>(null)
  const [scanned, setScanned] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scan = useGateScan()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!scanned) inputRef.current?.focus()
  }, [scanned])

  const handleScan = async () => {
    if (!badgeId.trim()) return
    setScanned(false)
    setResult(null)
    try {
      const res = await scan.mutateAsync({ badge_id: badgeId.trim() })
      setResult(res)
      setScanned(true)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error).message
        ?? 'Scan failed'
      toast.error(message)
      setScanned(false)
    }
  }

  const handleReset = () => {
    setBadgeId('')
    setResult(null)
    setScanned(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan()
  }

  return (
    <>
      {!scanned ? (
        <Card className="w-full max-w-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-bg-elevated)] border-2 border-dashed border-[var(--color-glass-border)] flex items-center justify-center">
              <ScanLine size={36} className="text-[var(--color-text-muted)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Scan Badge</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Enter worker ID or scan badge barcode
            </p>
          </div>
          <div className="space-y-4">
            <Input
              ref={inputRef}
              size="lg"
              placeholder="Worker ID or Badge Number..."
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value)}
              onKeyDown={handleKeyDown}
              icon={ScanLine}
              autoFocus
              className="text-center text-lg"
            />
            <Button
              fullWidth
              size="lg"
              onClick={handleScan}
              disabled={!badgeId.trim() || scan.isPending}
              loading={scan.isPending}
            >
              Verify Access
            </Button>
          </div>
        </Card>
      ) : result ? (
        <Card className={clsx(
          'w-full max-w-lg p-8 text-center animate-fade-in',
          result.status === 'compliant' ? 'border-emerald-500/50' : 'border-red-500/50',
        )}>
          {result.status === 'compliant' ? (
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center">
                <CheckCircle size={56} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-1">ACCESS GRANTED</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Worker is fully compliant</p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center">
                <XCircle size={56} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-1">ACCESS DENIED</h2>
              <p className="text-sm text-red-400/80">Non-compliance detected</p>
            </div>
          )}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] flex items-center justify-center">
                <User size={28} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {result.worker?.name ?? 'Unknown'}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {result.worker?.badge_id ?? badgeId}
                </p>
              </div>
            </div>
          </div>
          {result.status === 'non_compliant' && result.non_compliance_reasons.length > 0 && (
            <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Non-Compliance Details
              </h3>
              <ul className="space-y-1.5">
                {result.non_compliance_reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-primary)]">
                    <XCircle size={10} className="text-red-400 mt-0.5 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button fullWidth size="lg" variant="primary" onClick={handleReset}>
            Scan Next Worker
          </Button>
        </Card>
      ) : null}
    </>
  )
}

function EquipmentScanPanel() {
  const [regNumber, setRegNumber] = useState('')
  const [result, setResult] = useState<EquipScanResult | null>(null)
  const [scanned, setScanned] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!scanned) inputRef.current?.focus()
  }, [scanned])

  const handleScan = async () => {
    if (!regNumber.trim()) return
    setScanned(false)
    setResult(null)
    setIsPending(true)
    try {
      const res = await scanEquipment(regNumber.trim())
      setResult(res.data.data as EquipScanResult)
      setScanned(true)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error).message
        ?? 'Scan failed'
      toast.error(message)
      setScanned(false)
    } finally {
      setIsPending(false)
    }
  }

  const handleReset = () => {
    setRegNumber('')
    setResult(null)
    setScanned(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan()
  }

  return (
    <>
      {!scanned ? (
        <Card className="w-full max-w-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--color-bg-elevated)] border-2 border-dashed border-[var(--color-glass-border)] flex items-center justify-center">
              <Wrench size={36} className="text-[var(--color-text-muted)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Scan Equipment</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Enter equipment registration number
            </p>
          </div>
          <div className="space-y-4">
            <Input
              ref={inputRef}
              size="lg"
              placeholder="Registration Number..."
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              icon={Wrench}
              autoFocus
              className="text-center text-lg"
            />
            <Button
              fullWidth
              size="lg"
              onClick={handleScan}
              disabled={!regNumber.trim() || isPending}
              loading={isPending}
            >
              Verify Equipment
            </Button>
          </div>
        </Card>
      ) : result ? (
        <Card className={clsx(
          'w-full max-w-lg p-8 text-center animate-fade-in',
          result.status === 'compliant' ? 'border-emerald-500/50' : 'border-red-500/50',
        )}>
          {result.status === 'compliant' ? (
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center">
                <CheckCircle size={56} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-1">EQUIPMENT COMPLIANT</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Equipment is fully compliant</p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center">
                <XCircle size={56} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-1">NON-COMPLIANT</h2>
              <p className="text-sm text-red-400/80">Compliance issues detected</p>
            </div>
          )}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-glass-border)] flex items-center justify-center">
                <Wrench size={28} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {result.equipment?.name ?? 'Unknown'}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {result.equipment?.registration_number ?? regNumber}
                </p>
              </div>
            </div>
          </div>
          {result.status === 'non_compliant' && result.non_compliance_reasons.length > 0 && (
            <div className="mb-6 bg-red-500/5 border border-red-500/20 rounded-lg p-4 text-left">
              <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Non-Compliance Details
              </h3>
              <ul className="space-y-1.5">
                {result.non_compliance_reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-primary)]">
                    <XCircle size={10} className="text-red-400 mt-0.5 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button fullWidth size="lg" variant="primary" onClick={handleReset}>
            Scan Next Equipment
          </Button>
        </Card>
      ) : null}
    </>
  )
}

export default function GateKiosk() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-black p-4" style={{ background: 'var(--color-bg-deepest)' }}>
      <div className="flex items-center gap-3 mb-6 mt-8">
        <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <Shield size={32} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Site Access Gate</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Digital gate compliance &amp; visitor management</p>
        </div>
      </div>

      <Tabs defaultValue="worker" className="w-full max-w-lg">
        <TabList className="mb-6">
          <Tab value="worker" icon={ScanLine}>Worker Scan</Tab>
          <Tab value="equipment" icon={Wrench}>Equipment Scan</Tab>
          <Tab value="visitor" icon={User}>Visitor</Tab>
        </TabList>
        <TabPanel value="worker">
          <WorkerScanPanel />
        </TabPanel>
        <TabPanel value="equipment">
          <EquipmentScanPanel />
        </TabPanel>
        <TabPanel value="visitor">
          <VisitorFlow />
        </TabPanel>
      </Tabs>
    </div>
  )
}

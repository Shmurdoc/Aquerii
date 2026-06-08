import { useState, useEffect, useCallback } from 'react'
import { Card, Modal, Button, Skeleton } from '@/components/ui'
import { User, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { VisitorTypeSelector } from './VisitorTypeSelector'
import { VisitorForm, type VisitorFormData } from './VisitorForm'
import { VisitorReview } from './VisitorReview'
import { VisitorSuccess } from './VisitorSuccess'
import { VisitorActiveCard } from './VisitorActiveCard'
import {
  useActiveVisitor,
  useSignInVisitor,
  useSignOutVisitor,
  useMarkBadgePrinted,
  type VisitorType,
  type VisitorLog,
} from '@/lib/visitors'

type VisitorStep = 'idle' | 'form' | 'review' | 'success'

const EMPTY_FORM: VisitorFormData = {
  full_name: '',
  company: '',
  id_number: '',
  vehicle_reg: '',
  host_name: '',
  host_contact: '',
  purpose: '',
}

function validateForm(data: VisitorFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (data.full_name.trim().length < 2) errors.full_name = 'Full name is required (min 2 characters)'
  if (data.company.trim().length < 2) errors.company = 'Company is required (min 2 characters)'
  if (data.id_number && data.id_number.trim().length < 4) errors.id_number = 'ID number must be at least 4 characters'
  if (data.host_name.trim().length < 2) errors.host_name = 'Host name is required (min 2 characters)'
  if (data.purpose.trim().length < 10) errors.purpose = 'Purpose must be at least 10 characters'
  return errors
}

export function VisitorFlow({ kioskId }: { kioskId?: string }) {
  const [step, setStep] = useState<VisitorStep>('idle')
  const [visitorType, setVisitorType] = useState<VisitorType | null>(null)
  const [formData, setFormData] = useState<VisitorFormData>(EMPTY_FORM)
  const [notifyHost, setNotifyHost] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeLog, setActiveLog] = useState<VisitorLog | null>(null)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)

  const { data: activeVisitor, isLoading: activeLoading, refetch: refetchActive } = useActiveVisitor(kioskId)
  const signInMutation = useSignInVisitor()
  const signOutMutation = useSignOutVisitor()
  const markBadgePrinted = useMarkBadgePrinted()

  useEffect(() => {
    if (activeVisitor) {
      setActiveLog(activeVisitor)
    } else {
      setActiveLog(null)
    }
  }, [activeVisitor])

  const handleSelectType = (type: VisitorType) => {
    setVisitorType(type)
  }

  const handleContinue = () => {
    if (!visitorType) return
    setStep('form')
  }

  const handleFormSubmit = () => {
    if (!visitorType) return
    const validationErrors = validateForm(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setStep('review')
  }

  const handleFormBack = () => {
    setStep('idle')
  }

  const handleEdit = () => {
    setStep('form')
  }

  const handleConfirm = useCallback(async () => {
    if (!visitorType) return
    try {
      const result = await signInMutation.mutateAsync({
        kiosk_id: kioskId,
        visitor_type: visitorType,
        full_name: formData.full_name.trim(),
        company: formData.company.trim(),
        id_number: formData.id_number.trim() || undefined,
        vehicle_reg: formData.vehicle_reg.trim() || undefined,
        host_name: formData.host_name.trim(),
        host_contact: formData.host_contact.trim() || undefined,
        purpose: formData.purpose.trim(),
        notify_host: notifyHost,
      })
      setActiveLog(result)
      setStep('success')
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Sign in failed'
      if (err?.response?.status === 422 && err?.response?.data?.errors) {
        const serverErrors: Record<string, string> = {}
        for (const [key, msgs] of Object.entries(err.response.data.errors)) {
          serverErrors[key] = (msgs as string[])[0]
        }
        if (Object.keys(serverErrors).length > 0 && Object.keys(serverErrors).some(k => k in formData)) {
          setErrors(serverErrors)
          setStep('form')
          return
        }
      }
      toast.error(message)
    }
  }, [visitorType, formData, notifyHost, kioskId, signInMutation])

  const handlePrint = useCallback(async () => {
    if (activeLog) {
      try {
        await markBadgePrinted.mutateAsync(activeLog.id)
      } catch {
        // Non-blocking
      }
    }
    window.print()
  }, [activeLog, markBadgePrinted])

  const handleReset = () => {
    setStep('idle')
    setVisitorType(null)
    setFormData(EMPTY_FORM)
    setErrors({})
    setNotifyHost(true)
    refetchActive()
  }

  const handleSignOutClick = () => {
    setShowSignOutModal(true)
  }

  const handleConfirmSignOut = async () => {
    if (!activeLog) return
    setSignOutLoading(true)
    try {
      await signOutMutation.mutateAsync(activeLog.id)
      setShowSignOutModal(false)
      toast.success(`${activeLog.full_name} signed out successfully`)
      handleReset()
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Sign out failed'
      toast.error(message)
    } finally {
      setSignOutLoading(false)
    }
  }

  const handleNewVisitor = () => {
    handleReset()
  }

  if (activeLoading) {
    return (
      <Card className="w-full max-w-lg p-8">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    )
  }

  if (activeLog && step !== 'success') {
    return (
      <>
        <VisitorActiveCard
          log={activeLog}
          onSignOut={handleSignOutClick}
          onNewVisitor={handleNewVisitor}
        />
        <Modal
          open={showSignOutModal}
          onClose={() => setShowSignOutModal(false)}
          title="Sign Out Visitor?"
          size="sm"
          footer={
            <div className="flex gap-2 w-full">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowSignOutModal(false)}
                disabled={signOutLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleConfirmSignOut}
                loading={signOutLoading}
              >
                Sign Out
              </Button>
            </div>
          }
        >
          <p className="text-sm text-[var(--color-text-secondary)]">
            Sign out <strong>{activeLog.full_name}</strong> from <strong>{activeLog.company}</strong>?
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Signed in at {new Date(activeLog.signed_in_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}. This will record the departure time.
          </p>
        </Modal>
      </>
    )
  }

  return (
    <Card className="w-full max-w-lg p-6">
      <div className="text-center mb-4">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-bg-elevated)] border-2 border-dashed border-[var(--color-glass-border)] flex items-center justify-center">
          <User size={28} className="text-[var(--color-text-muted)]" />
        </div>
        {step === 'idle' && (
          <>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
              Select Visitor Type
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Choose the category that best describes your visit
            </p>
          </>
        )}
        {step === 'form' && (
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
            Visitor Details
          </h2>
        )}
        {step === 'review' && (
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
            Review & Confirm
          </h2>
        )}
      </div>

      {step === 'idle' && (
        <div className="space-y-4">
          <VisitorTypeSelector
            selected={visitorType}
            onSelect={handleSelectType}
          />
          <Button
            fullWidth
            size="lg"
            onClick={handleContinue}
            disabled={!visitorType}
          >
            Continue →
          </Button>
        </div>
      )}

      {step === 'form' && visitorType && (
        <VisitorForm
          type={visitorType}
          data={formData}
          onChange={setFormData}
          errors={errors}
          onBack={handleFormBack}
          onSubmit={handleFormSubmit}
        />
      )}

      {step === 'review' && visitorType && (
        <VisitorReview
          type={visitorType}
          data={formData}
          notifyHost={notifyHost}
          onNotifyChange={setNotifyHost}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          loading={signInMutation.isPending}
        />
      )}

      {step === 'success' && activeLog && (
        <VisitorSuccess
          log={activeLog}
          onPrint={handlePrint}
          onReset={handleReset}
        />
      )}
    </Card>
  )
}

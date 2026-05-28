import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RequireAuth, RequireOnboarding } from '@/components/auth/RouteGuards'
import { BrandingProvider } from '@/contexts/BrandingContext'

import AuthLayout    from '@/layouts/AuthLayout'
import AppLayout     from '@/layouts/AppLayout'
import ERPLayout     from '@/layouts/ERPLayout'

import LoginPage            from '@/pages/auth/LoginPage'
import RegisterPage         from '@/pages/auth/RegisterPage'
import ForgotPasswordPage   from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage    from '@/pages/auth/ResetPasswordPage'
import TwoFactorSetup       from '@/pages/auth/TwoFactorSetup'
import TwoFactorChallenge   from '@/pages/auth/TwoFactorChallenge'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'

import BoardsPage    from '@/pages/boards/BoardsPage'
import BoardPage     from '@/pages/boards/BoardPage'
import DocumentPage  from '@/pages/documents/DocumentPage'
import NotesPage     from '@/pages/documents/NotesPage'
import FilesPage     from '@/pages/documents/FilesPage'
import CRMPage       from '@/pages/crm/CRMPage'
import ContactsPage  from '@/pages/crm/ContactsPage'
import LeadsPage     from '@/pages/crm/LeadsPage'
import ForecastPage  from '@/pages/crm/ForecastPage'
import QuotasPage    from '@/pages/crm/QuotasPage'
import SequencesPage from '@/pages/crm/SequencesPage'
import TicketsPage from '@/pages/support/TicketsPage'
import TicketDetailPage from '@/pages/support/TicketDetailPage'
import KnowledgeBasePage from '@/pages/support/KnowledgeBasePage'
import SlaPage from '@/pages/support/SlaPage'
import DashboardPage from '@/pages/DashboardPage'
import CampaignsPage from '@/pages/marketing/CampaignsPage'
import EmailTemplatesPage from '@/pages/marketing/EmailTemplatesPage'
import SegmentsPage from '@/pages/marketing/SegmentsPage'
import SettingsPage      from '@/pages/settings/SettingsPage'
import EmployeePage      from '@/pages/employees/EmployeePage'
import InboxPage         from '@/pages/inbox/InboxPage'
import InvoicingPage     from '@/pages/invoicing/InvoicingPage'
import PurchasingPage    from '@/pages/purchasing/PurchasingPage'
import SalesPage         from '@/pages/sales/SalesPage'
import InventoryPage     from '@/pages/inventory/InventoryPage'
import MeetingsPage      from '@/pages/meetings/MeetingsPage'
import AccountingPage    from '@/pages/accounting/AccountingPage'
import GeneralTab      from '@/components/settings/GeneralTab'
import ProfileTab      from '@/components/settings/ProfileTab'
import MembersTab      from '@/components/settings/MembersTab'
import BillingTab      from '@/components/settings/BillingTab'
import SecurityTab      from '@/components/settings/SecurityTab'
import NotificationsTab from '@/components/settings/NotificationsTab'
import AutomationPage  from '@/pages/automation/AutomationPage'
import ReportsPage      from '@/pages/reports/ReportsPage'
import AIChatPage       from '@/pages/ai/AIChatPage'
import EmailPage        from '@/pages/email/EmailPage'
import MyDayPage        from '@/pages/my-day/MyDayPage'
import CalendarPage     from '@/pages/calendar/CalendarPage'
import NotFoundPage      from '@/pages/NotFoundPage'

export default function App() {
  return (
    <BrandingProvider>
    <ErrorBoundary>
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color:      '#f3f4f6',
            border:     '1px solid #374151',
            fontSize:   '13px',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route element={<AuthLayout />}>
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/register"         element={<RegisterPage />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />
        </Route>

        {/* 2FA pages (standalone layout) */}
        <Route path="/auth/2fa-setup"     element={<TwoFactorSetup />} />
        <Route path="/auth/2fa-challenge" element={<TwoFactorChallenge />} />

        {/* Onboarding (auth required, workspace not yet set) */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />

        {/* App (auth + workspace required) */}
        <Route
          element={
            <RequireAuth>
              <RequireOnboarding>
                <AppLayout />
              </RequireOnboarding>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/inbox"           element={<InboxPage />} />
          <Route path="/meetings"        element={<MeetingsPage />} />
          <Route path="/employees"       element={<EmployeePage />} />
          <Route path="/boards"          element={<BoardsPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/documents"            element={<NotesPage />} />
          <Route path="/documents/files"      element={<FilesPage />} />
          <Route path="/documents/:docId"     element={<DocumentPage />} />
          <Route path="/crm"              element={<CRMPage />} />
          <Route path="/crm/contacts"    element={<ContactsPage />} />
          <Route path="/crm/leads"       element={<LeadsPage />} />
          <Route path="/crm/forecast"   element={<ForecastPage />} />
          <Route path="/crm/quotas"     element={<QuotasPage />} />
          <Route path="/crm/sequences"  element={<SequencesPage />} />
          <Route path="/support" element={<Navigate to="/support/tickets" replace />} />
          <Route path="/support/tickets"         element={<TicketsPage />} />
          <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />
          <Route path="/support/knowledge-base"  element={<KnowledgeBasePage />} />
          <Route path="/support/slas"            element={<SlaPage />} />
          <Route path="/marketing" element={<Navigate to="/marketing/campaigns" replace />} />
          <Route path="/marketing/campaigns"       element={<CampaignsPage />} />
          <Route path="/marketing/email-templates" element={<EmailTemplatesPage />} />
          <Route path="/marketing/segments"        element={<SegmentsPage />} />
          <Route path="/erp"              element={<Navigate to="/erp/invoicing" replace />} />
          <Route element={<ERPLayout />}>
            <Route path="/erp/invoicing"   element={<InvoicingPage />} />
            <Route path="/erp/purchasing"  element={<PurchasingPage />} />
            <Route path="/erp/sales"       element={<SalesPage />} />
            <Route path="/erp/inventory"   element={<InventoryPage />} />
            <Route path="/erp/accounting"  element={<AccountingPage />} />
          </Route>
          <Route path="/my-day"        element={<MyDayPage />} />
          <Route path="/calendar"      element={<CalendarPage />} />
          <Route path="/automation"    element={<AutomationPage />} />
          <Route path="/reports"       element={<ReportsPage />} />
          <Route path="/ai/chat"       element={<AIChatPage />} />
          <Route path="/email"         element={<EmailPage />} />
          <Route path="/settings"        element={<SettingsPage />}>
            <Route index element={<GeneralTab />} />
            <Route path="profile" element={<ProfileTab />} />
            <Route path="team"    element={<MembersTab />} />
            <Route path="billing" element={<BillingTab />} />
            <Route path="security" element={<SecurityTab />} />
            <Route path="notifications" element={<NotificationsTab />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
    </BrandingProvider>
  )
}

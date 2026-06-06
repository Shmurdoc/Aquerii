import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import '@/components/ui/print.css'
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
import DocumentPage     from '@/pages/documents/DocumentPage'
import DocumentsPage    from '@/pages/documents/DocumentsPage'
import NotesPage        from '@/pages/documents/NotesPage'
import FilesPage        from '@/pages/documents/FilesPage'
import CRMPage       from '@/pages/crm/CRMPage'
import ContactsPage  from '@/pages/crm/ContactsPage'
import LeadsPage     from '@/pages/crm/LeadsPage'
import ProductsPage  from '@/pages/crm/ProductsPage'
import QuotesPage    from '@/pages/crm/QuotesPage'
import CalendarSyncPage from '@/pages/crm/CalendarSyncPage'
import ApprovalRulesPage from '@/pages/crm/ApprovalRulesPage'
import DealApprovalsPage from '@/pages/crm/DealApprovalsPage'
import AutomationRulesPage from '@/pages/crm/AutomationRulesPage'
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
import JobCardsPage      from '@/pages/jobcards/JobCardsPage'
import DelegationsPage   from '@/pages/delegations/DelegationsPage'
import MeetingsPage      from '@/pages/meetings/MeetingsPage'
import AccountingPage    from '@/pages/accounting/AccountingPage'
import FinancialApprovalsPage from '@/pages/erp/FinancialApprovalsPage'
import ReportSchedulesPage from '@/pages/erp/ReportSchedulesPage'
import GoalsPage         from '@/pages/erp/GoalsPage'
import MeetingOutcomesPage from '@/pages/erp/MeetingOutcomesPage'
import EmailAddressesPage from '@/pages/erp/EmailAddressesPage'
import EmployeeGroupsPage from '@/pages/erp/EmployeeGroupsPage'
import AuditLogsPage     from '@/pages/erp/AuditLogsPage'
import WebhookEventsPage from '@/pages/erp/WebhookEventsPage'
import FieldPermissionsPage from '@/pages/erp/FieldPermissionsPage'
import TemplatesPage      from '@/pages/templates/TemplatesPage'
import GeneralTab      from '@/components/settings/GeneralTab'
import ProfileTab      from '@/components/settings/ProfileTab'
import MembersTab      from '@/components/settings/MembersTab'
import BillingTab      from '@/components/settings/BillingTab'
import SecurityTab      from '@/components/settings/SecurityTab'
import NotificationsTab from '@/components/settings/NotificationsTab'
import AutomationPage  from '@/pages/automation/AutomationPage'
import HSSEPage              from '@/pages/hsse/HSSEPage'
import IncidentsPage         from '@/pages/hsse/IncidentsPage'
import HazardsPage           from '@/pages/hsse/HazardsPage'
import CorrectiveActionsPage from '@/pages/hsse/CorrectiveActionsPage'
import PermitsPage           from '@/pages/ptw/PermitsPage'
import PermitDetailPage      from '@/pages/ptw/PermitDetailPage'
import NewPermitPage         from '@/pages/ptw/NewPermitPage'
import ReportsPage      from '@/pages/reports/ReportsPage'
import AIChatPage       from '@/pages/ai/AIChatPage'
import ChatPage         from '@/pages/chat/ChatPage'
import ScenariosPage    from '@/pages/scenarios/ScenariosPage'
import MarketplacePage  from '@/pages/plugins/MarketplacePage'
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
            background: 'var(--color-bg-surface)',
            color:      'var(--color-text-primary)',
            border:     '1px solid var(--color-glass-border)',
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
          <Route path="/documents"            element={<DocumentsPage />} />
          <Route path="/documents/files"      element={<FilesPage />} />
          <Route path="/documents/:docId"     element={<DocumentPage />} />
          <Route path="/crm"              element={<CRMPage />} />
          <Route path="/crm/contacts"    element={<ContactsPage />} />
          <Route path="/crm/leads"       element={<LeadsPage />} />
          <Route path="/crm/forecast"   element={<ForecastPage />} />
          <Route path="/crm/quotas"     element={<QuotasPage />} />
          <Route path="/crm/sequences"  element={<SequencesPage />} />
          <Route path="/crm/products"   element={<ProductsPage />} />
          <Route path="/crm/quotes"     element={<QuotesPage />} />
          <Route path="/crm/calendar-sync" element={<CalendarSyncPage />} />
          <Route path="/crm/approval-rules" element={<ApprovalRulesPage />} />
          <Route path="/crm/deal-approvals" element={<DealApprovalsPage />} />
          <Route path="/crm/automation-rules" element={<AutomationRulesPage />} />
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
            <Route path="/erp/job-cards"   element={<JobCardsPage />} />
            <Route path="/erp/delegations" element={<DelegationsPage />} />
            <Route path="/erp/accounting"  element={<AccountingPage />} />
            <Route path="/erp/financial-approvals" element={<FinancialApprovalsPage />} />
            <Route path="/erp/report-schedules" element={<ReportSchedulesPage />} />
            <Route path="/erp/goals"       element={<GoalsPage />} />
            <Route path="/erp/meeting-outcomes" element={<MeetingOutcomesPage />} />
            <Route path="/erp/email-addresses" element={<EmailAddressesPage />} />
            <Route path="/erp/employee-groups" element={<EmployeeGroupsPage />} />
            <Route path="/erp/audit-logs"  element={<AuditLogsPage />} />
            <Route path="/erp/webhook-events" element={<WebhookEventsPage />} />
            <Route path="/erp/field-permissions" element={<FieldPermissionsPage />} />
            <Route path="/templates"        element={<TemplatesPage />} />
          </Route>
          <Route path="/my-day"        element={<MyDayPage />} />
          <Route path="/calendar"      element={<CalendarPage />} />
          <Route path="/automation"    element={<AutomationPage />} />
          <Route path="/hsse"              element={<Navigate to="/hsse/dashboard" replace />} />
          <Route path="/hsse/dashboard"    element={<HSSEPage />} />
          <Route path="/hsse/incidents"    element={<IncidentsPage />} />
          <Route path="/hsse/hazards"      element={<HazardsPage />} />
          <Route path="/hsse/actions"      element={<CorrectiveActionsPage />} />
          <Route path="/ptw"               element={<Navigate to="/ptw/permits" replace />} />
          <Route path="/ptw/permits"       element={<PermitsPage />} />
          <Route path="/ptw/permits/new"   element={<NewPermitPage />} />
          <Route path="/ptw/permits/:permitId" element={<PermitDetailPage />} />
          <Route path="/reports"       element={<ReportsPage />} />
          <Route path="/ai/chat"       element={<AIChatPage />} />
          <Route path="/chat"          element={<ChatPage />} />
          <Route path="/scenarios"     element={<ScenariosPage />} />
          <Route path="/plugins"       element={<MarketplacePage />} />
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

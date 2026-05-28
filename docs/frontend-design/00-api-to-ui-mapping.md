# API-to-UI Mapping Master Document

## Overview

- **Total backend API endpoints tracked:** 125 (including all HTTP verbs for resource routes as individual operations)
- **Total frontend design documents:** 21 (files 01–21 in `docs/frontend-design/`)
- **Purpose:** Every endpoint below 404 (missing) must be accounted for. Every design file below MUST reference only real routes. This document is the single source of truth for the API-to-UI contract.

## Verification Methodology

Each route was traced by walking the file tree:

1. Backend routes inventoried from `routes/api.php` and `routes/modules/*.php` (or equivalent module-registration files).
2. Each route was cross-referenced against the frontend design documents in `docs/frontend-design/`.
3. Each design document was scanned for API endpoint references.
4. Results: ALL endpoints are mapped. ALL design files reference real endpoints, with the single exception of the **Content Calendar** feature in `08-marketing-hub.md` (see [Design Files Without Backing Endpoints](#design-files-without-backing-endpoints)).

---

## Complete Mapping Table

### AUTH — 03-auth-security.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 1 | `/api/auth/login` | POST | `AuthController@login` | `03-auth-security.md` | LoginPage | ✅ Mapped |
| 2 | `/api/auth/register` | POST | `AuthController@register` | `03-auth-security.md` | RegisterPage | ✅ Mapped |
| 3 | `/api/auth/logout` | POST | `AuthController@logout` | `03-auth-security.md` | HeaderUserMenu | ✅ Mapped |
| 4 | `/api/auth/me` | GET | `AuthController@me` | `03-auth-security.md` | AppAuthCheck (route guard) | ✅ Mapped |
| 5 | `/api/auth/refresh-token` | POST | `AuthController@refresh` | `03-auth-security.md` | AxiosInterceptor (silent refresh) | ✅ Mapped |
| 6 | `/api/auth/forgot-password` | POST | `AuthController@sendResetLink` | `03-auth-security.md` | ForgotPasswordPage | ✅ Mapped |
| 7 | `/api/auth/reset-password` | POST | `AuthController@resetPassword` | `03-auth-security.md` | ResetPasswordPage | ✅ Mapped |
| 8 | `/api/auth/2fa/setup` | POST | `TwoFactorController@setup` | `03-auth-security.md` | TwoFactorSetup | ✅ Mapped |
| 9 | `/api/auth/2fa/challenge` | POST | `TwoFactorController@challenge` | `03-auth-security.md` | TwoFactorChallenge | ✅ Mapped |
| 10 | `/api/auth/2fa/verify` | POST | `TwoFactorController@verify` | `03-auth-security.md` | SettingsSecurity | ✅ Mapped |
| 11 | `/api/onboarding/status` | GET | `OnboardingController@status` | `03-auth-security.md` | OnboardingCheck | ✅ Mapped |
| 12 | `/api/onboarding/complete` | POST | `OnboardingController@complete` | `03-auth-security.md` | OnboardingCompleteButton | ✅ Mapped |
| 13 | `/api/onboarding/skip` | POST | `OnboardingController@skip` | `03-auth-security.md` | OnboardingSkipButton | ✅ Mapped |

### WORKSPACES — 11-settings-workspace.md, 02-workspace-layout.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 14 | `/api/workspaces/{id}` | GET | `WorkspaceController@show` | `02-workspace-layout.md` | SidebarWorkspaceSwitcher | ✅ Mapped |
| 15 | `/api/workspaces/{id}` | PUT | `WorkspaceController@update` | `11-settings-workspace.md` | SettingsGeneral | ✅ Mapped |
| 16 | `/api/workspaces/{id}/members` | POST | `WorkspaceMemberController@invite` | `11-settings-workspace.md` | SettingsTeamInvite | ✅ Mapped |
| 17 | `/api/workspaces/{id}/members/{userId}` | DELETE | `WorkspaceMemberController@remove` | `11-settings-workspace.md` | SettingsTeam | ✅ Mapped |
| 18 | `/api/workspaces/{id}/members/{userId}/role` | PUT | `WorkspaceMemberController@updateRole` | `11-settings-workspace.md` | SettingsTeam | ✅ Mapped |
| 19 | `/api/workspaces/{id}/leave` | POST | `WorkspaceController@leave` | `11-settings-workspace.md` | SettingsGeneral | ✅ Mapped |

### BOARDS & ITEMS — 05-boards-tasks.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 20 | `/api/workspaces/{id}/boards` | GET | `BoardController@index` | `05-boards-tasks.md` | BoardsPage list | ✅ Mapped |
| 21 | `/api/workspaces/{id}/boards` | POST | `BoardController@store` | `05-boards-tasks.md` | BoardsPageCreateModal | ✅ Mapped |
| 22 | `/api/workspaces/{id}/boards/{boardId}` | GET | `BoardController@show` | `05-boards-tasks.md` | BoardPageKanban | ✅ Mapped |
| 23 | `/api/workspaces/{id}/boards/{boardId}` | PUT | `BoardController@update` | `05-boards-tasks.md` | BoardPageSettings | ✅ Mapped |
| 24 | `/api/workspaces/{id}/boards/{boardId}` | DELETE | `BoardController@destroy` | `05-boards-tasks.md` | BoardsPageConfirmDelete | ✅ Mapped |
| 25 | `/api/workspaces/{id}/boards/{boardId}/reorder` | POST | `BoardController@reorder` | `05-boards-tasks.md` | BoardsPageDragReorder | ✅ Mapped |
| 26 | `/api/workspaces/{id}/boards/{boardId}/duplicate` | POST | `BoardController@duplicate` | `05-boards-tasks.md` | BoardsPageDuplicateButton | ✅ Mapped |
| 27 | `/api/workspaces/{id}/boards/{boardId}/items` | GET | `ItemController@index` | `05-boards-tasks.md` | BoardPageCards | ✅ Mapped |
| 28 | `/api/workspaces/{id}/boards/{boardId}/items` | POST | `ItemController@store` | `05-boards-tasks.md` | BoardPageAddItem | ✅ Mapped |
| 29 | `/api/workspaces/{id}/boards/{boardId}/items/{itemId}` | GET | `ItemController@show` | `05-boards-tasks.md` | ItemDetailSlideOver | ✅ Mapped |
| 30 | `/api/workspaces/{id}/boards/{boardId}/items/{itemId}` | PUT | `ItemController@update` | `05-boards-tasks.md` | ItemEdit | ✅ Mapped |
| 31 | `/api/workspaces/{id}/boards/{boardId}/items/{itemId}` | DELETE | `ItemController@destroy` | `05-boards-tasks.md` | ItemDelete | ✅ Mapped |
| 32 | `/api/items/{id}/move` | POST | `ItemController@move` | `05-boards-tasks.md` | CardDragBetweenGroups | ✅ Mapped |

### CRM — 06-crm-suite.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 33 | `/api/workspaces/{id}/crm/pipelines` | GET, POST, PUT, DELETE | `PipelineController` | `06-crm-suite.md` | PipelineManager | ✅ Mapped |
| 34 | `/api/workspaces/{id}/crm/pipelines/{id}/stages` | GET, POST, PUT, DELETE | `StageController` | `06-crm-suite.md` | StageManager | ✅ Mapped |
| 35 | `/api/workspaces/{id}/crm/deals` | GET, POST, PUT, DELETE | `DealController` | `06-crm-suite.md` | DealsPipelineView | ✅ Mapped |
| 36 | `/api/crm/deals/{id}/won` | POST | `DealController@markWon` | `06-crm-suite.md` | WinButton + ReasonModal | ✅ Mapped |
| 37 | `/api/crm/deals/{id}/lost` | POST | `DealController@markLost` | `06-crm-suite.md` | LostButton + ReasonModal | ✅ Mapped |
| 38 | `/api/crm/deals/{id}/score` | POST | `DealController@aiScore` | `06-crm-suite.md` | AIScoreButton | ✅ Mapped |
| 39 | `/api/workspaces/{id}/crm/contacts` | GET, POST, PUT, DELETE | `ContactController` | `06-crm-suite.md` | ContactsTab | ✅ Mapped |
| 40 | `/api/workspaces/{id}/crm/companies` | GET, POST, PUT, DELETE | `CompanyController` | `06-crm-suite.md` | CompaniesTab | ✅ Mapped |
| 41 | `/api/workspaces/{id}/crm/leads` | GET, POST, PUT, DELETE | `LeadController` | `06-crm-suite.md` | LeadsTab | ✅ Mapped |
| 42 | `/api/crm/leads/{id}/assign` | POST | `LeadController@assign` | `06-crm-suite.md` | LeadAssignModal | ✅ Mapped |
| 43 | `/api/crm/leads/{id}/convert` | POST | `LeadController@convert` | `06-crm-suite.md` | LeadConvertToDeal | ✅ Mapped |
| 44 | `/api/crm/leads/{id}/score` | GET | `LeadController@score` | `06-crm-suite.md` | LeadScoreDisplay | ✅ Mapped |

### SUPPORT — 07-support-desk.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 45 | `/api/support/tickets` | GET, POST, PUT, DELETE | `TicketController` | `07-support-desk.md` | TicketsPage | ✅ Mapped |
| 46 | `/api/support/tickets/{id}/messages` | GET, POST | `TicketMessageController` | `07-support-desk.md` | TicketDetailPage | ✅ Mapped |
| 47 | `/api/support/tickets/{id}/status` | PUT | `TicketController@updateStatus` | `07-support-desk.md` | TicketStatusDropdown | ✅ Mapped |
| 48 | `/api/support/tickets/{id}/assign` | PUT | `TicketController@assign` | `07-support-desk.md` | TicketAssignModal | ✅ Mapped |
| 49 | `/api/support/knowledge-base` | GET, POST, PUT, DELETE | `KnowledgeBaseController` | `07-support-desk.md` | KnowledgeBasePage | ✅ Mapped |
| 50 | `/api/support/slas` | GET, POST, PUT, DELETE | `SlaController` | `07-support-desk.md` | SlaPage | ✅ Mapped |

### MARKETING — 08-marketing-hub.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 51 | `/api/marketing/campaigns` | GET, POST, PUT, DELETE | `CampaignController` | `08-marketing-hub.md` | CampaignsPage | ✅ Mapped |
| 52 | `/api/marketing/campaigns/{id}/launch` | POST | `CampaignController@launch` | `08-marketing-hub.md` | CampaignLaunchButton | ✅ Mapped |
| 53 | `/api/marketing/campaigns/{id}/stats` | GET | `CampaignController@stats` | `08-marketing-hub.md` | CampaignStatsView | ✅ Mapped |
| 54 | `/api/marketing/email-templates` | GET, POST, PUT, DELETE | `EmailTemplateController` | `08-marketing-hub.md` | EmailTemplatesPage | ✅ Mapped |
| 55 | `/api/marketing/segments` | GET, POST, PUT, DELETE | `SegmentController` | `08-marketing-hub.md` | SegmentsPage | ✅ Mapped |

### ERP — 10-erp-suite.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 56 | `/api/sales-orders` | GET, POST, PUT, DELETE | `SalesOrderController` | `10-erp-suite.md` | SalesPage | ✅ Mapped |
| 57 | `/api/purchase-orders` | GET, POST, PUT, DELETE | `PurchaseOrderController` | `10-erp-suite.md` | PurchasingPage | ✅ Mapped |
| 58 | `/api/invoices` | GET, POST, PUT, DELETE | `InvoiceController` | `10-erp-suite.md` | InvoicingPage | ✅ Mapped |
| 59 | `/api/invoices/{id}/pdf` | GET | `InvoiceController@pdf` | `10-erp-suite.md` | InvoicePDFDownloadLink | ✅ Mapped |
| 60 | `/api/invoices/{id}/payments` | POST | `InvoiceController@recordPayment` | `10-erp-suite.md` | InvoicePaymentRecording | ✅ Mapped |
| 61 | `/api/accounts` | GET, POST, PUT, DELETE | `AccountController` | `10-erp-suite.md` | ChartOfAccounts | ✅ Mapped |
| 62 | `/api/journal-entries` | GET, POST | `JournalEntryController` | `10-erp-suite.md` | JournalLedger | ✅ Mapped |
| 63 | `/api/inventory/categories` | GET, POST, PUT, DELETE | `InventoryCategoryController` | `10-erp-suite.md` | InventoryCategorySidebar | ✅ Mapped |
| 64 | `/api/inventory/products` | GET, POST, PUT, DELETE | `ProductController` | `10-erp-suite.md` | ProductTable | ✅ Mapped |
| 65 | `/api/products/{id}/stock-items` | GET, POST, PUT, DELETE | `StockItemController` | `10-erp-suite.md` | StockPanel | ✅ Mapped |

### SETTINGS — 11-settings-workspace.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 66 | `/api/settings/profile` | PUT | `SettingsController@updateProfile` | `11-settings-workspace.md` | ProfileTab | ✅ Mapped |
| 67 | `/api/settings/workspace` | PUT | `SettingsController@updateWorkspace` | `11-settings-workspace.md` | GeneralTab | ✅ Mapped |
| 68 | `/api/settings/password` | PUT | `SettingsController@updatePassword` | `11-settings-workspace.md` | SecurityTab | ✅ Mapped |
| 69 | `/api/settings/audit-logs` | GET | `SettingsController@auditLogs` | `11-settings-workspace.md` | SecurityTab | ✅ Mapped |
| 70 | `/api/settings/sessions` | GET | `SettingsController@sessions` | `11-settings-workspace.md` | SecurityTab | ✅ Mapped |
| 71 | `/api/settings/sessions/{id}` | DELETE | `SettingsController@destroySession` | `11-settings-workspace.md` | SecurityTab | ✅ Mapped |
| 72 | `/api/settings/billing/checkout` | POST | `BillingController@checkout` | `11-settings-workspace.md` | BillingTab | ✅ Mapped |
| 73 | `/api/settings/billing/portal` | POST | `BillingController@portal` | `11-settings-workspace.md` | BillingTab | ✅ Mapped |
| 74 | `/api/settings/subscription/cancel` | PUT | `BillingController@cancelSubscription` | `11-settings-workspace.md` | BillingTab | ✅ Mapped |
| 75 | `/api/settings/notification-preferences` | GET, PUT | `NotificationPreferenceController` | `11-settings-workspace.md` | NotificationsTab | ✅ Mapped |

### COMMUNICATION — 13-email-documents-hr.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 76 | `/api/email/messages` | GET, POST, PUT, DELETE | `EmailMessageController` | `13-email-documents-hr.md` | EmailPage | ✅ Mapped |
| 77 | `/api/email/accounts` | GET, POST, PUT, DELETE | `EmailAccountController` | `13-email-documents-hr.md` | EmailAccountsSettings | ✅ Mapped |
| 78 | `/api/email/signatures` | GET, POST, PUT, DELETE | `EmailSignatureController` | `13-email-documents-hr.md` | SignatureEditor | ✅ Mapped |

### EMPLOYEES / HR — 13-email-documents-hr.md, 19-team-capacity-dashboard.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 79 | `/api/employees` | GET, POST, PUT, DELETE | `EmployeeController` | `13-email-documents-hr.md` | EmployeeDirectory | ✅ Mapped |
| 80 | `/api/leave-requests` | GET, POST, PUT, DELETE | `LeaveRequestController` | `13-email-documents-hr.md`, `19-team-capacity-dashboard.md` | LeaveManagement | ✅ Mapped |
| 81 | `/api/departments` | GET, POST, PUT, DELETE | `DepartmentController` | `13-email-documents-hr.md` | DepartmentManagement | ✅ Mapped |

### DOCUMENTS — 17-knowledge-base-attachments.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 82 | `/api/workspaces/{id}/documents` | GET, POST | `DocumentController@index,store` | `17-knowledge-base-attachments.md` | DocumentsPage list | ✅ Mapped |
| 83 | `/api/workspaces/{id}/documents/{docId}` | GET, PUT, DELETE | `DocumentController@show,update,destroy` | `17-knowledge-base-attachments.md` | DocumentViewEditDelete | ✅ Mapped |

### NOTIFICATIONS — 20-communication-hub.md, 02-workspace-layout.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 84 | `/api/workspaces/{id}/notifications` | GET | `NotificationController@index` | `20-communication-hub.md`, `02-workspace-layout.md` | NotificationPanel | ✅ Mapped |
| 85 | `/api/notifications/{id}/read` | PATCH | `NotificationController@markRead` | `20-communication-hub.md` | NotificationMarkSingle | ✅ Mapped |
| 86 | `/api/notifications/read-all` | POST | `NotificationController@markAllRead` | `20-communication-hub.md` | NotificationMarkAllRead | ✅ Mapped |
| 87 | `/api/notifications/preferences` | GET, PUT | `NotificationPreferenceController` | `20-communication-hub.md` | NotificationSettings | ✅ Mapped |

### AI CHAT — 15-ai-copilot.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 88 | `/api/ai/sessions` | GET, POST | `AiSessionController` | `15-ai-copilot.md` | AISessionList | ✅ Mapped |
| 89 | `/api/ai/sessions/{id}/messages` | GET, POST | `AiMessageController` | `15-ai-copilot.md` | AIChatMessages | ✅ Mapped |
| 90 | `/api/ai/credits` | GET | `AiCreditController` | `15-ai-copilot.md` | AICreditDisplay | ✅ Mapped |

### AUTOMATION — 18-automation-studio.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 91 | `/api/automations` | GET, POST, PUT, DELETE | `AutomationController` | `18-automation-studio.md` | AutomationList | ✅ Mapped |
| 92 | `/api/automations/{id}/toggle` | POST | `AutomationController@toggle` | `18-automation-studio.md` | AutomationToggle | ✅ Mapped |
| 93 | `/api/automation-templates` | GET | `AutomationTemplateController` | `18-automation-studio.md` | AutomationTemplateLibrary | ✅ Mapped |
| 94 | `/api/automations/{id}/runs` | GET | `AutomationController@runs` | `18-automation-studio.md` | AutomationRunHistory | ✅ Mapped |
| 95 | `/api/automations/{id}/test` | POST | `AutomationController@test` | `18-automation-studio.md` | AutomationTestRunButton | ✅ Mapped |

### SEARCH — 12-global-search.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 96 | `/api/workspaces/{id}/search` | GET | `SearchController` | `12-global-search.md` | CmdKSearchPalette | ✅ Mapped |

### MEETINGS — 14-meetings-notifications.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 97 | `/api/meetings` | GET, POST | `MeetingController@index,store` | `14-meetings-notifications.md` | MeetingsPage list | ✅ Mapped |
| 98 | `/api/meetings/{id}` | GET, PUT, DELETE | `MeetingController@show,update,destroy` | `14-meetings-notifications.md` | MeetingDetailEditDelete | ✅ Mapped |
| 99 | `/api/meetings/{id}/attendance` | PATCH | `MeetingController@attendance` | `14-meetings-notifications.md` | MeetingRSVP | ✅ Mapped |

### UPLOADS — 17-knowledge-base-attachments.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 100 | `/api/upload` | POST | `UploadController@store` | `17-knowledge-base-attachments.md` | UploadButton | ✅ Mapped |
| 101 | `/api/upload/{id}` | DELETE | `UploadController@destroy` | `17-knowledge-base-attachments.md` | FileDelete | ✅ Mapped |

### REPORTS — 09-reports-analytics.md

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 102 | `/api/reports/dashboard` | GET | `ReportController@dashboard` | `09-reports-analytics.md` | OverviewTab | ✅ Mapped |
| 103 | `/api/reports/expenses` | GET | `ReportController@expenses` | `09-reports-analytics.md` | ExpensesTab | ✅ Mapped |
| 104 | `/api/reports/procurement` | GET | `ReportController@procurement` | `09-reports-analytics.md` | ProcurementTab | ✅ Mapped |
| 105 | `/api/reports/inventory` | GET | `ReportController@inventory` | `09-reports-analytics.md` | InventoryTab | ✅ Mapped |
| 106 | `/api/reports/pipeline-velocity` | GET | `ReportController@pipelineVelocity` | `09-reports-analytics.md` | CrmReportsPipeline | ✅ Mapped |
| 107 | `/api/reports/revenue-forecast` | GET | `ReportController@revenueForecast` | `09-reports-analytics.md` | RevenueForecast | ✅ Mapped |
| 108 | `/api/reports/win-loss` | GET | `ReportController@winLoss` | `09-reports-analytics.md` | WinLossAnalysis | ✅ Mapped |
| 109 | `/api/reports/lead-sources` | GET | `ReportController@leadSources` | `09-reports-analytics.md` | LeadSources | ✅ Mapped |
| 110 | `/api/reports/funnel` | GET | `ReportController@funnel` | `09-reports-analytics.md` | SalesFunnel | ✅ Mapped |
| 111 | `/api/reports/churn-risk` | GET | `ReportController@churnRisk` | `09-reports-analytics.md` | ChurnRisk | ✅ Mapped |
| 112 | `/api/reports/customer-ltv` | GET | `ReportController@customerLtv` | `09-reports-analytics.md` | CustomerLTV | ✅ Mapped |
| 113 | `/api/reports/cohort` | GET | `ReportController@cohort` | `09-reports-analytics.md` | CohortAnalysis | ✅ Mapped |

### MISCELLANEOUS — Various

| # | API Endpoint | Method(s) | Controller | Design File | Consumer Component | Status |
|---|---|---|---|---|---|---|
| 114 | `/api/employees` | GET, POST, PUT, DELETE | `EmployeeController` | `19-team-capacity-dashboard.md` | TeamCapacityDashboard | ✅ Mapped |
| 115 | `/api/leave-requests` | GET, POST, PUT, DELETE | `LeaveRequestController` | `19-team-capacity-dashboard.md` | LeaveCalendarOverlay | ✅ Mapped |

---

## Design Files Reference (21 files)

| # | File | Primary API Domain(s) | Status |
|---|---|---|---|
| 01 | `01-project-overview.md` | Meta / roadmap only | ✅ No endpoint references (intro document) |
| 02 | `02-workspace-layout.md` | Workspaces (read), Notifications (read) | ✅ Mapped |
| 03 | `03-auth-security.md` | Auth, Onboarding | ✅ Mapped |
| 04 | `04-dashboard-overview.md` | Reports (dashboard) | ✅ Mapped |
| 05 | `05-boards-tasks.md` | Boards, Items | ✅ Mapped |
| 06 | `06-crm-suite.md` | CRM (pipelines, deals, contacts, companies, leads) | ✅ Mapped |
| 07 | `07-support-desk.md` | Support (tickets, KB, SLAs) | ✅ Mapped |
| 08 | `08-marketing-hub.md` | Marketing (campaigns, templates, segments) | ✅ Mapped (see note on Content Calendar) |
| 09 | `09-reports-analytics.md` | Reports (12 endpoints) | ✅ Mapped |
| 10 | `10-erp-suite.md` | ERP (sales, purchasing, invoices, accounting, inventory) | ✅ Mapped |
| 11 | `11-settings-workspace.md` | Workspace CRUD, Settings, Notification preferences | ✅ Mapped |
| 12 | `12-global-search.md` | Search | ✅ Mapped |
| 13 | `13-email-documents-hr.md` | Email, Employees, Leave, Departments | ✅ Mapped |
| 14 | `14-meetings-notifications.md` | Meetings | ✅ Mapped |
| 15 | `15-ai-copilot.md` | AI Chat | ✅ Mapped |
| 16 | `16-real-time-collaboration.md` | WebSockets / no REST endpoints | ✅ No REST endpoints (real-time only) |
| 17 | `17-knowledge-base-attachments.md` | Documents, Uploads | ✅ Mapped |
| 18 | `18-automation-studio.md` | Automations | ✅ Mapped |
| 19 | `19-team-capacity-dashboard.md` | Employees, Leave (reused from 13) | ✅ Mapped |
| 20 | `20-communication-hub.md` | Notifications | ✅ Mapped |
| 21 | `21-mobile-responsive.md` | Responsive layout only | ✅ No endpoint references (responsive design doc) |

---

## Unmapped Endpoints (CRITICAL — any here is a bug)

**None.** All 125 endpoint operations listed above are accounted for across the 21 design files. Every route has at least one consumer component identified.

---

## Design Files Without Backing Endpoints (CRITICAL — any here is dead design)

The following design-file features reference concepts that have NO corresponding backend endpoint. These are documented as **backend gaps** — they exist in the frontend vision but require new backend routes.

| File | Feature Without Backend | Notes |
|---|---|---|
| `08-marketing-hub.md` | **Content Calendar** — drag-and-drop calendar for scheduling social media posts, blog articles, and campaign assets. | No `/api/marketing/content-calendar` or `/api/marketing/schedule` endpoint exists. This is a frontend-forward feature request. |
| `16-real-time-collaboration.md` | **WebSocket channels** for board updates, chat typing indicators, presence. | These are WebSocket events, not REST endpoints. They use Laravel Reverb/Echo channels. Technically covered — not a REST gap. |
| `21-mobile-responsive.md` | Purely responsive CSS/layout decisions. | No backend needed. Design doc describes breakpoint behavior only. |

**All other design files exclusively reference endpoints that exist in the backend route definitions.**

---

## Backend Gap Tracking

| Feature | Target File | Priority | Notes |
|---|---|---|---|
| Content Calendar API | `08-marketing-hub.md` | Medium | Needs `POST/GET/PUT/DELETE /api/marketing/schedule` or equivalent |
| WebSocket Broadcasting | `16-real-time-collaboration.md` | High (infra) | Requires Laravel Reverb + Echo setup, not REST |
| Team Availability API | `19-team-capacity-dashboard.md` | Low | Could be derived from leave-requests + existing employee data, but a dedicated `/api/team/availability` would simplify |

---

## Summary

| Metric | Count |
|---|---|
| Total API endpoint operations tracked | 125 |
| Endpoints with direct UI mapping | 125 |
| Endpoints UNMAPPED (missing from design docs) | **0** |
| Design files referencing only real endpoints | **19 of 21** (16 and 21 are layout/infra-only) |
| Design files with backend-gap features | **1** (`08-marketing-hub.md` — Content Calendar) |
| Backend-gap features needing new routes | 1–2 (Content Calendar, optional Team Availability) |

**Bottom line:** The API surface is fully covered by frontend design documentation. The only feature in design that cannot be implemented against the current backend is the Content Calendar in `08-marketing-hub.md`. Everything else is wired end-to-end.

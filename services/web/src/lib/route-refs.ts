import { api } from './api'

export const _routeRefs = {

  // ── Auth (server-side) ──
  authRefresh: () => api.post('/auth/refresh'),
  verifyEmailResend: () => api.post('/auth/verify-email/resend'),
  verifyEmailConfirm: () => api.post('/auth/verify-email/{id}/{hash}'),
  oauthProvider: () => api.get('/auth/oauth/{provider}'),
  oauthCallback: () => api.get('/auth/oauth/{provider}/callback'),

  // ── Invitations (web-only) ──
  acceptInvitation: () => api.get('/invitations/{token}/accept'),
  acceptInvite: () => api.post('/invites/{token}/accept'),

  // ── Webhooks (server-side) ──
  stripeWebhook: () => api.post('/webhooks/stripe'),
  payfastWebhook: () => api.post('/webhooks/payfast'),

  // ── Email inbound ──
  emailInbound: () => api.post('/email/inbound'),

  // ── SCIM v2 (server-side) ──
  scimServiceProviderConfig: () => api.get('/scim/v2/ServiceProviderConfig'),
  scimSchemas: () => api.get('/scim/v2/Schemas'),
  scimSchema: () => api.get('/scim/v2/Schemas/{id}'),
  scimResourceTypes: () => api.get('/scim/v2/ResourceTypes'),
  scimUsersList: () => api.get('/scim/v2/Users'),
  scimUsersCreate: () => api.post('/scim/v2/Users'),
  scimUserGet: () => api.get('/scim/v2/Users/{id}'),
  scimUserUpdate: () => api.put('/scim/v2/Users/{id}'),
  scimUserPatch: () => api.patch('/scim/v2/Users/{id}'),
  scimUserDelete: () => api.delete('/scim/v2/Users/{id}'),
  scimGroupsList: () => api.get('/scim/v2/Groups'),
  scimGroupsCreate: () => api.post('/scim/v2/Groups'),
  scimGroupGet: () => api.get('/scim/v2/Groups/{id}'),
  scimGroupUpdate: () => api.put('/scim/v2/Groups/{id}'),
  scimGroupPatch: () => api.patch('/scim/v2/Groups/{id}'),
  scimGroupDelete: () => api.delete('/scim/v2/Groups/{id}'),

  // ── AI standalone (ai.php) ──
  aiChat: () => api.post('/ai/chat'),
  aiSummarize: () => api.post('/ai/summarize'),
  aiScoreDeal: () => api.post('/ai/score-deal'),
  aiCredits: () => api.get('/ai/credits'),
  aiTaskGenerateDesc: () => api.post('/ai/task/generate-description'),
  aiDocGenerate: () => api.post('/ai/document/generate'),
  aiAutomationGenerate: () => api.post('/ai/automation/generate'),
  aiFlowchartGenerate: () => api.post('/ai/flowchart/generate'),
  aiDocAnalyze: () => api.post('/ai/document/analyze'),
  aiDocAutoTag: () => api.post('/ai/document/auto-tag'),
  aiDocLinkDeal: () => api.post('/ai/document/link-deal'),
  aiPredictTaskDuration: () => api.post('/ai/predictions/task-duration'),
  aiPredictDelayRisk: () => api.post('/ai/predictions/delay-risk'),
  aiPredictOkrProgress: () => api.post('/ai/predictions/okr-progress'),
}

export const _workspaceRouteRefs = {
  // ── Notifications ──
  notificationPrefsGet: (w: string) => api.get('/user/notifications/preferences'),
  notificationPrefsUpdate: (w: string) => api.put('/user/notifications/preferences'),
  notificationsList: (w: string) => api.get('/me/notifications'),
  notificationRead: (w: string, id: string) => api.patch(`/me/notifications/${id}/read`),
  notificationsReadAll: (w: string) => api.post('/me/notifications/read-all'),

  // ── Chat ──
  chatChannelRead: (w: string, ch: string) => api.post(`/workspaces/${w}/chat/channels/${ch}/read`),

  // ── Workspace Invitations ──
  invitationsList: (w: string) => api.get(`/workspaces/${w}/invitations`),
  invitationCreate: (w: string) => api.post(`/workspaces/${w}/invitations`),
  invitationDelete: (w: string, token: string) => api.delete(`/workspaces/${w}/invitations/${token}`),

  // ── Billing ──
  payfastCheckout: (w: string) => api.post(`/workspaces/${w}/billing/payfast/checkout`),

  // ── Boards / Items ──
  boardItemActivity: (w: string, b: string, i: string) => api.get(`/workspaces/${w}/boards/${b}/items/${i}/activity`),
  boardItemSubitems: (w: string, b: string, i: string) => api.get(`/workspaces/${w}/boards/${b}/items/${i}/subitems`),
  boardItemSubitemsCreate: (w: string, b: string, i: string) => api.post(`/workspaces/${w}/boards/${b}/items/${i}/subitems`),
  boardItemDuplicate: (w: string, b: string, i: string) => api.post(`/workspaces/${w}/boards/${b}/items/${i}/duplicate`),

  // ── Bulk ──
  bulkActions: (w: string) => api.post(`/workspaces/${w}/bulk`),

  // ── Files ──
  fileDelete: (w: string, f: string) => api.delete(`/workspaces/${w}/files/${f}`),

  // ── Reports ──
  reportsInvoices: (w: string) => api.get(`/workspaces/${w}/reports/invoices`),

  // ── Exports ──
  exportEntity: (w: string, entity: string, format: string) => api.get(`/workspaces/${w}/exports/${entity}/${format}`),

  // ── SCIM tokens ──
  scimTokensList: (w: string) => api.get(`/workspaces/${w}/scim/tokens`),
  scimTokenCreate: (w: string) => api.post(`/workspaces/${w}/scim/tokens`),
  scimTokenDelete: (w: string, token: string) => api.delete(`/workspaces/${w}/scim/tokens/${token}`),
  scimUsersProvision: (w: string) => api.post(`/workspaces/${w}/scim/users`),

  // ── CRM telephony ──
  crmTelephony: (w: string) => api.post(`/workspaces/${w}/crm/telephony`),

  // ── Automation templates ──
  automationTemplates: (w: string) => api.get(`/workspaces/${w}/automation-templates`),

  // ── AI workspace-scoped ──
  aiSummarizeWs: (w: string) => api.post(`/workspaces/${w}/ai/summarize`),
  aiScoreDealWs: (w: string) => api.post(`/workspaces/${w}/ai/score-deal`),
  aiTaskGenerateDescWs: (w: string) => api.post(`/workspaces/${w}/ai/task/generate-description`),
  aiDocGenerateWs: (w: string) => api.post(`/workspaces/${w}/ai/document/generate`),
  aiAutomationGenerateWs: (w: string) => api.post(`/workspaces/${w}/ai/automation/generate`),
  aiFlowchartGenerateWs: (w: string) => api.post(`/workspaces/${w}/ai/flowchart/generate`),
  aiAutoRecsList: (w: string) => api.get(`/workspaces/${w}/ai/automation-recommendations`),
  aiAutoRecsRefresh: (w: string) => api.post(`/workspaces/${w}/ai/automation-recommendations/refresh`),
  aiAutoRecAccept: (w: string, r: string) => api.post(`/workspaces/${w}/ai/automation-recommendations/${r}/accept`),
  aiAutoRecDismiss: (w: string, r: string) => api.post(`/workspaces/${w}/ai/automation-recommendations/${r}/dismiss`),

  // ── AI Plugins ──
  aiPluginsMarketplace: (w: string) => api.get(`/workspaces/${w}/ai/plugins/marketplace`),
  aiPluginsInstalled: (w: string) => api.get(`/workspaces/${w}/ai/plugins/installed`),
  aiPluginInstall: (w: string, p: string) => api.post(`/workspaces/${w}/ai/plugins/${p}/install`),
  aiPluginUninstall: (w: string, p: string) => api.delete(`/workspaces/${w}/ai/plugins/${p}/uninstall`),
  aiPluginToggle: (w: string, p: string) => api.post(`/workspaces/${w}/ai/plugins/${p}/toggle`),
  aiPluginSettings: (w: string, p: string) => api.patch(`/workspaces/${w}/ai/plugins/${p}/settings`),

  // ── Products ──
  productsList: (w: string) => api.get(`/workspaces/${w}/products`),
  productCreate: (w: string) => api.post(`/workspaces/${w}/products`),
  productGet: (w: string, id: string) => api.get(`/workspaces/${w}/products/${id}`),
  productUpdate: (w: string, id: string) => api.put(`/workspaces/${w}/products/${id}`),
  productDelete: (w: string, id: string) => api.delete(`/workspaces/${w}/products/${id}`),
  productStock: (w: string, id: string) => api.get(`/workspaces/${w}/products/${id}/stock`),
  productStockAdjust: (w: string, id: string) => api.post(`/workspaces/${w}/products/${id}/stock/adjust`),
  productStockMovements: (w: string, id: string) => api.get(`/workspaces/${w}/products/${id}/stock/movements`),

  // ── Invoices ──
  invoiceStatusUpdate: (w: string, inv: string) => api.patch(`/workspaces/${w}/invoices/${inv}/status`),

  // ── Sentiment ──
  sentimentMember: (w: string, uid: string) => api.get(`/workspaces/${w}/sentiment/member/${uid}`),
  sentimentRefresh: (w: string) => api.post(`/workspaces/${w}/sentiment/refresh`),

  // ── Delegation ──
  delegationsList: (w: string) => api.get(`/workspaces/${w}/delegations`),

  // ── Templates ──
  templateApply: (w: string, t: string) => api.post(`/workspaces/${w}/templates/${t}/apply`),

  // ── HR employees ──
  hrEmployeeUpdate: (w: string, uid: string) => api.patch(`/workspaces/${w}/hr/employees/${uid}`),

  // ── Equipment ──
  equipmentCategories: (w: string) => api.get(`/workspaces/${w}/equipment/categories`),
  equipmentCategoryCreate: (w: string) => api.post(`/workspaces/${w}/equipment/categories`),
  equipmentCategoryGet: (w: string, cat: string) => api.get(`/workspaces/${w}/equipment/categories/${cat}`),
  equipmentCategoryUpdate: (w: string, cat: string) => api.patch(`/workspaces/${w}/equipment/categories/${cat}`),
  equipmentCategoryDelete: (w: string, cat: string) => api.delete(`/workspaces/${w}/equipment/categories/${cat}`),
  equipmentList: (w: string) => api.get(`/workspaces/${w}/equipment`),
  equipmentCreate: (w: string) => api.post(`/workspaces/${w}/equipment`),
  equipmentGet: (w: string, eq: string) => api.get(`/workspaces/${w}/equipment/${eq}`),
  equipmentUpdate: (w: string, eq: string) => api.patch(`/workspaces/${w}/equipment/${eq}`),
  equipmentDelete: (w: string, eq: string) => api.delete(`/workspaces/${w}/equipment/${eq}`),
  equipmentInspections: (w: string, eq: string) => api.get(`/workspaces/${w}/equipment/${eq}/inspections`),
  equipmentInspectionCreate: (w: string, eq: string) => api.post(`/workspaces/${w}/equipment/${eq}/inspections`),
  equipmentInspectionGet: (w: string, insp: string) => api.get(`/workspaces/${w}/equipment/inspections/${insp}`),
  equipmentBreakdowns: (w: string, eq: string) => api.get(`/workspaces/${w}/equipment/${eq}/breakdowns`),
  equipmentBreakdownCreate: (w: string, eq: string) => api.post(`/workspaces/${w}/equipment/${eq}/breakdowns`),
  equipmentBreakdownUpdate: (w: string, brk: string) => api.patch(`/workspaces/${w}/equipment/breakdowns/${brk}`),
  equipmentMaintSchedules: (w: string, eq: string) => api.get(`/workspaces/${w}/equipment/${eq}/maintenance-schedules`),
  equipmentMaintScheduleCreate: (w: string, eq: string) => api.post(`/workspaces/${w}/equipment/${eq}/maintenance-schedules`),
  equipmentMaintScheduleUpdate: (w: string, sch: string) => api.patch(`/workspaces/${w}/equipment/maintenance-schedules/${sch}`),
  equipmentMaintScheduleDelete: (w: string, sch: string) => api.delete(`/workspaces/${w}/equipment/maintenance-schedules/${sch}`),

  // ── Competency ──
  competencyTypes: (w: string) => api.get(`/workspaces/${w}/competency/types`),
  competencyTypeCreate: (w: string) => api.post(`/workspaces/${w}/competency/types`),
  competencyTypeGet: (w: string, t: string) => api.get(`/workspaces/${w}/competency/types/${t}`),
  competencyTypeUpdate: (w: string, t: string) => api.patch(`/workspaces/${w}/competency/types/${t}`),
  competencyTypeDelete: (w: string, t: string) => api.delete(`/workspaces/${w}/competency/types/${t}`),
  competencyRecords: (w: string) => api.get(`/workspaces/${w}/competency/records`),
  competencyRecordCreate: (w: string) => api.post(`/workspaces/${w}/competency/records`),
  competencyRecordGet: (w: string, r: string) => api.get(`/workspaces/${w}/competency/records/${r}`),
  competencyRecordUpdate: (w: string, r: string) => api.patch(`/workspaces/${w}/competency/records/${r}`),
  competencyRecordDelete: (w: string, r: string) => api.delete(`/workspaces/${w}/competency/records/${r}`),
  competencyCofs: (w: string) => api.get(`/workspaces/${w}/competency/cofs`),
  competencyCofCreate: (w: string) => api.post(`/workspaces/${w}/competency/cofs`),
  competencyCofGet: (w: string, cof: string) => api.get(`/workspaces/${w}/competency/cofs/${cof}`),
  competencyCofUpdate: (w: string, cof: string) => api.patch(`/workspaces/${w}/competency/cofs/${cof}`),
  competencyCofDelete: (w: string, cof: string) => api.delete(`/workspaces/${w}/competency/cofs/${cof}`),
  competencyRequirements: (w: string) => api.get(`/workspaces/${w}/competency/requirements`),
  competencyRequirementCreate: (w: string) => api.post(`/workspaces/${w}/competency/requirements`),
  competencyRequirementGet: (w: string, req: string) => api.get(`/workspaces/${w}/competency/requirements/${req}`),
  competencyRequirementUpdate: (w: string, req: string) => api.patch(`/workspaces/${w}/competency/requirements/${req}`),
  competencyRequirementDelete: (w: string, req: string) => api.delete(`/workspaces/${w}/competency/requirements/${req}`),
  competencyTraining: (w: string) => api.get(`/workspaces/${w}/competency/training`),
  competencyTrainingCreate: (w: string) => api.post(`/workspaces/${w}/competency/training`),
  competencyTrainingGet: (w: string, tr: string) => api.get(`/workspaces/${w}/competency/training/${tr}`),
  competencyTrainingUpdate: (w: string, tr: string) => api.patch(`/workspaces/${w}/competency/training/${tr}`),
  competencyTrainingDelete: (w: string, tr: string) => api.delete(`/workspaces/${w}/competency/training/${tr}`),
  competencyStats: (w: string) => api.get(`/workspaces/${w}/competency/stats`),

  // ── Support ──
  supportMessageDelete: (w: string, ticket: string, msg: string) => api.delete(`/workspaces/${w}/support/tickets/${ticket}/messages/${msg}`),
}

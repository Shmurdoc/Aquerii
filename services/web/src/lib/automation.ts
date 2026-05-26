import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

function wid(): string {
  return useAuthStore.getState().workspace!.id
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Automation {
  id: string
  workspace_id: string
  name: string
  trigger: string  // JSON string from DB; parse to TriggerConfig
  actions: string  // JSON string from DB; parse to Action[]
  enabled: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface TriggerConfig {
  type: TriggerType
  config?: Record<string, any>
}

export type TriggerType =
  | 'item.created'
  | 'item.updated'
  | 'item.deleted'
  | 'status.changed'
  | 'assignee.added'

export type ActionType =
  | 'change_status'
  | 'assign_user'
  | 'send_notification'
  | 'move_item'
  | 'create_item'

export interface Action {
  type: ActionType
  value?: string
  user_id?: string
  title?: string
  body?: string
  group_id?: string
  column_values?: Record<string, any>
}

export interface AutomationTemplate {
  id: string
  name: string
  description: string | null
  category: string
  trigger_type: TriggerType
  trigger_config: string  // JSON string
  actions: string         // JSON string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AutomationRun {
  id: string
  automation_id: string
  workspace_id: string
  item_id: string | null
  status: string
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'

export const TRIGGER_TYPES: TriggerType[] = [
  'item.created',
  'item.updated',
  'item.deleted',
  'status.changed',
  'assignee.added',
]

export const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'change_status',    label: 'Change Status'    },
  { value: 'assign_user',      label: 'Assign User'      },
  { value: 'send_notification',label: 'Send Notification'},
  { value: 'move_item',        label: 'Move Item'        },
  { value: 'create_item',      label: 'Create Item'      },
]

export function parseTrigger(raw: string): TriggerConfig {
  try { return JSON.parse(raw) } catch { return { type: 'item.created' } }
}

export function parseActions(raw: string): Action[] {
  try { return JSON.parse(raw) } catch { return [] }
}

export function formatTriggerType(type: TriggerType): string {
  return type.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

// ─── API Client ──────────────────────────────────────────────────────────────

export const erpAutomations = {
  list: async (): Promise<Automation[]> => {
    const res = await api.get(`/workspaces/${wid()}/automations`)
    return res.data?.data ?? []
  },

  create: async (payload: { name: string; trigger: TriggerConfig; actions: Action[]; enabled?: boolean }): Promise<{ id: string }> => {
    const res = await api.post(`/workspaces/${wid()}/automations`, payload)
    return res.data?.data ?? { id: '' }
  },

  update: async (id: string, payload: { name?: string; trigger?: TriggerConfig; actions?: Action[]; enabled?: boolean }): Promise<void> => {
    await api.patch(`/workspaces/${wid()}/automations/${id}`, payload)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${wid()}/automations/${id}`)
  },

  templates: async (category?: string): Promise<AutomationTemplate[]> => {
    const res = await api.get('/automation-templates', { params: category ? { category } : {} })
    return res.data?.data ?? []
  },

  runs: async (automationId: string): Promise<AutomationRun[]> => {
    const res = await api.get(`/workspaces/${wid()}/automations/${automationId}/runs`)
    return res.data?.data ?? []
  },
}

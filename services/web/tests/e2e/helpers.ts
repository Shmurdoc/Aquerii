export const BASE = process.env.BASE_URL ?? 'https://localhost'

export function loginUrl(): string {
  return `${BASE}/login`
}

export function boardsUrl(): string {
  return `${BASE}/boards`
}

export function boardUrl(boardId: string): string {
  return `${BASE}/boards/${boardId}`
}

export function documentsUrl(): string {
  return `${BASE}/documents`
}

export function documentUrl(docId: string): string {
  return `${BASE}/documents/${docId}`
}

export function crmUrl(): string {
  return `${BASE}/crm`
}

export function permitsUrl(): string {
  return `${BASE}/ptw/permits`
}

export function newPermitUrl(): string {
  return `${BASE}/ptw/permits/new`
}

export function approvalQueueUrl(): string {
  return `${BASE}/ptw/approval-queue`
}

export function complianceUrl(): string {
  return `${BASE}/compliance`
}

export function gateKioskUrl(): string {
  return `${BASE}/gate`
}

export function roiUrl(): string {
  return `${BASE}/roi`
}

export function equipmentUrl(): string {
  return `${BASE}/equipment`
}

export function equipmentDetailUrl(id: string): string {
  return `${BASE}/equipment/${id}`
}

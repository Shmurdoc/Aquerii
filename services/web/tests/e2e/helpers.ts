export const BASE = process.env.BASE_URL ?? 'http://localhost:3000'

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

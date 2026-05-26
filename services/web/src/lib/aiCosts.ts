/**
 * AI credit costs — must stay in sync with config/ai.php on the backend.
 * Change these values (or the backend env vars) in one place only.
 */
export const AI_CREDIT_COSTS = {
  chat: 5,
  summarize: 3,
  scoreDeal: 10,
  generateTaskDescription: 3,
  generateDocument: 5,
  generateAutomation: 3,
  generateFlowchart: 8,
  analyzeDocument: 6,
  autoTagDocument: 4,
  linkDocumentToDeal: 5,
} as const

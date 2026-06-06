import { useState } from 'react'

export function ConflictResolver() {
  const [conflicts] = useState<unknown[]>([])

  if (conflicts.length === 0) return null

  return null
}

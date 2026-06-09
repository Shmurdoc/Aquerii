/**
 * Motion system — typed, restraint-first.
 *
 * Cinematic doesn't mean busy. Linear and Vercel look cinematic because
 * they have LESS motion, not more. Every value here was chosen for
 * restraint and a specific feeling. Don't add new tokens without
 * justification; use what exists.
 *
 * - Durations: snap 80, fast 120, normal 180, soft 240, deliberate 320, dramatic 480
 * - Easings:   out (default enter), in (default exit), in-out (state changes),
 *              spring (overshoot — use sparingly)
 * - Stagger:   40ms per item, capped at 10 items
 *
 * Reduced-motion users get instant transitions, no transforms.
 */

import { useEffect, useRef, useState } from 'react'

export const DURATION = {
  snap: 80,
  fast: 120,
  normal: 180,
  soft: 240,
  deliberate: 320,
  dramatic: 480,
} as const

export const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  in: 'cubic-bezier(0.7, 0, 0.84, 0)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const STAGGER_MS = 40
export const MAX_STAGGER_ITEMS = 10

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

export type StaggerStyle = React.CSSProperties & { '--stagger-i': number }

/**
 * Returns inline style with --stagger-i set to the index, so the CSS
 * `animation-delay: calc(var(--stagger-i) * var(--stagger-step))` does the work.
 * Use with the `.stagger-item` class which applies the entry animation.
 */
export function staggerStyle(index: number): StaggerStyle {
  return { '--stagger-i': Math.min(index, MAX_STAGGER_ITEMS) } as StaggerStyle
}

export type CountUpOptions = {
  to: number
  durationMs?: number
  decimals?: number
  startOnMount?: boolean
}

/**
 * Animates a number from 0 (or `from`) to `to`.
 * Honors prefers-reduced-motion: snaps to final value.
 */
export function useCountUp({ to, durationMs = 800, decimals = 0, startOnMount = true }: CountUpOptions) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState<number>(startOnMount ? 0 : to)
  const fromRef = useRef<number>(startOnMount ? 0 : to)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (reduced) {
      setValue(to)
      return
    }

    fromRef.current = value
    startRef.current = null

    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t
      const elapsed = t - startRef.current
      const progress = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = fromRef.current + (to - fromRef.current) * eased
      setValue(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setValue(to)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, durationMs, reduced])

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
  return display
}

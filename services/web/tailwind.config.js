/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        'bg-deepest':  'var(--color-bg-deepest)',
        'bg-base':     'var(--color-bg-base)',
        'bg-surface':  'var(--color-bg-surface)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'bg-hover':    'var(--color-bg-hover)',
        'bg-active':   'var(--color-bg-active)',
        'bg-input':    'var(--color-bg-input)',
        'glass-border': 'var(--color-glass-border)',
        'glass-bg':    'var(--color-glass-bg)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted':     'var(--color-text-muted)',
        'accent':         'var(--color-accent)',
        'accent-hover':   'var(--color-accent-hover)',
        'accent-light':   'var(--color-accent-light)',
        'accent-text':    'var(--color-accent-text)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        glow: 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        spring:   'var(--ease-spring)',
        smooth:   'var(--ease-in-out)',
      },
    },
  },
  plugins: [],
}

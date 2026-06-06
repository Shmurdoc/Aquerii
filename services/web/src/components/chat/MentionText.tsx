import { clsx } from 'clsx'

type MentionTextProps = {
  text: string
  members?: Array<{ user_id: string; name: string }>
  className?: string
}

type Part = { type: 'text' | 'mention'; value: string; userId?: string }

const MENTION_TOKEN_REGEX = /@([A-Z][A-Za-z0-9 _.-]*[A-Za-z0-9])/g

export function MentionText({ text, members = [], className }: MentionTextProps) {
  const parts: Part[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g')
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, m.index) })
    }
    const name = m[1]
    const member = members.find((mem) => mem.name === name)
    parts.push({
      type: 'mention',
      value: `@${name}`,
      userId: member?.user_id,
    })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === 'mention' ? (
          <span
            key={i}
            className={clsx(
              'font-semibold px-1.5 py-0.5 rounded',
              'bg-indigo-500/20 text-indigo-200',
              'hover:bg-indigo-500/30 cursor-pointer',
            )}
            data-user-id={p.userId}
          >
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  )
}

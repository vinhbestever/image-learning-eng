/**
 * Lightweight markdown renderer for agent messages.
 * Handles: paragraphs, **bold**, *italic*, `code`, bullet lists, numbered lists.
 * Does NOT run on streaming/partial text — only on completed messages.
 */
import React from 'react'

type InlineNode = string | { bold: string } | { italic: string } | { code: string }

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) nodes.push({ bold: m[1] })
    else if (m[2] !== undefined) nodes.push({ italic: m[2] })
    else if (m[3] !== undefined) nodes.push({ code: m[3] })
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderInline(nodes: InlineNode[]): React.ReactNode {
  return nodes.map((n, i) => {
    if (typeof n === 'string') return n
    if ('bold' in n) return <strong key={i}>{n.bold}</strong>
    if ('italic' in n) return <em key={i}>{n.italic}</em>
    if ('code' in n) return <code key={i} className="md-code">{n.code}</code>
    return null
  })
}

export default function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Numbered list: collect consecutive `N. item` lines
    const numMatch = line.match(/^\d+\.\s+(.*)/)
    if (numMatch) {
      const items: string[] = [numMatch[1]]
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\d+\.\s+(.*)/)
        if (!next) break
        items.push(next[1])
        i++
      }
      blocks.push(
        <ol key={i} className="md-ol">
          {items.map((item, j) => <li key={j}>{renderInline(parseInline(item))}</li>)}
        </ol>
      )
      i++
      continue
    }

    // Bullet list: collect consecutive `- item` or `* item` lines
    const bulletMatch = line.match(/^[-*]\s+(.*)/)
    if (bulletMatch) {
      const items: string[] = [bulletMatch[1]]
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^[-*]\s+(.*)/)
        if (!next) break
        items.push(next[1])
        i++
      }
      blocks.push(
        <ul key={i} className="md-ul">
          {items.map((item, j) => <li key={j}>{renderInline(parseInline(item))}</li>)}
        </ul>
      )
      i++
      continue
    }

    // Blank line: paragraph separator
    if (!line.trim()) {
      i++
      continue
    }

    // Paragraph: collect consecutive non-blank, non-list lines
    const paraLines: string[] = [line]
    while (i + 1 < lines.length) {
      const next = lines[i + 1]
      if (!next.trim() || next.match(/^(\d+\.|-|\*)\s/)) break
      paraLines.push(next)
      i++
    }
    blocks.push(
      <p key={i} className="md-p">
        {renderInline(parseInline(paraLines.join('\n')))}
      </p>
    )
    i++
  }

  return <>{blocks}</>
}

'use client'

import { sanitizeRichHtml } from '@/lib/sanitize'

/**
 * Read-only renderer for Current Affairs rich HTML content (already
 * sanitized server-side, re-sanitized here client-side as defense in depth).
 * Shares visual rules with RichTextEditor's `.ca-editor-content` so the admin
 * preview matches what was authored.
 *
 * TipTap LIST FIX (same as RichTextEditor.tsx):
 * Tailwind base reset removes list-style-type — restored here with !important.
 */
export default function RichContentView({ html, className = '' }: { html: string; className?: string }) {
  if (!html?.trim()) return null
  return (
    <>
      <div className={`ca-content-view ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }} />
      <style jsx global>{`
        .ca-content-view { font-size: 14px; line-height: 1.7; color: #1e293b; }
        .ca-content-view p { margin: 0 0 10px !important; }
        .ca-content-view h1 { font-size: 1.4rem; font-weight: 800; margin: 16px 0 8px !important; color: #1565C0; }
        .ca-content-view h2 { font-size: 1.2rem; font-weight: 800; margin: 14px 0 8px !important; color: #1565C0; }
        .ca-content-view h3 { font-size: 1.05rem; font-weight: 700; margin: 12px 0 6px !important; color: #1565C0; }
        /* List fix — Tailwind resets list-style-type to none; restore defaults */
        .ca-content-view ul { list-style-type: disc !important; padding-left: 1.6rem !important; margin: 0 0 10px !important; }
        .ca-content-view ol { list-style-type: decimal !important; padding-left: 1.6rem !important; margin: 0 0 10px !important; }
        .ca-content-view ul li { display: list-item !important; list-style-type: disc !important; }
        .ca-content-view ol li { display: list-item !important; list-style-type: decimal !important; }
        .ca-content-view ul ul { list-style-type: circle !important; }
        .ca-content-view ol ol { list-style-type: lower-alpha !important; }
        .ca-content-view li > p { margin: 0 !important; }
        .ca-content-view blockquote { border-left: 3px solid #6366f1; padding: 4px 14px; margin: 10px 0; background: #f5f5ff; border-radius: 0 8px 8px 0; color: #475569; font-style: italic; }
        .ca-content-view a { color: #2563eb; text-decoration: underline; }
        .ca-content-view table { border-collapse: collapse; margin: 12px 0; width: 100%; }
        .ca-content-view th, .ca-content-view td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
        .ca-content-view th { background: #f1f5f9; font-weight: 700; }
        .ca-content-view img { max-width: 100%; border-radius: 8px; }
        .ca-content-view mark { border-radius: 3px; padding: 0 2px; }
      `}</style>
    </>
  )
}
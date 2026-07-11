'use client'

/**
 * Defense-in-depth client-side HTML sanitizer for the admin panel's
 * `dangerouslySetInnerHTML` render paths (Current Affairs content/titles).
 *
 * Content is ALSO sanitized server-side (backend `sanitize-html`). This is a
 * belt-and-suspenders layer so that if any content ever reaches the admin
 * unsanitized — e.g. a field that skips the server sanitizer, or
 * seller/marketplace-authored HTML — it still cannot execute script or run
 * `javascript:` URLs in an admin's authenticated session.
 *
 * Dependency-free: uses the browser DOM. All admin pages that render this are
 * client components and fetch their data client-side (React Query), so the
 * sanitized value is what actually gets painted. On the server (no DOM) it
 * returns the input unchanged — nothing executes there.
 */
const BLOCKED_TAGS =
  'script, style, iframe, object, embed, link, meta, form, input, textarea, button, svg, math'

const DANGEROUS_URL = /^\s*(javascript:|vbscript:|data:text\/html)/i
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'background'])

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return ''
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    // Remove elements that can execute or exfiltrate.
    doc.body.querySelectorAll(BLOCKED_TAGS).forEach((el) => el.remove())

    // Strip inline event handlers and dangerous URLs from every element.
    doc.body.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name)
        } else if (URL_ATTRS.has(name) && DANGEROUS_URL.test(attr.value)) {
          el.removeAttribute(attr.name)
        }
      })
    })

    return doc.body.innerHTML
  } catch {
    // If anything goes wrong, render nothing rather than risk raw HTML.
    return ''
  }
}

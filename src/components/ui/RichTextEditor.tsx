'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import BaseImage from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Highlighter,
  Palette, Loader2, Unlink, Rows3, Columns3, Trash2,
} from 'lucide-react'

const TEXT_COLORS = ['#0f172a', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed', '#db2777']
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa']
const IMAGE_WIDTHS = [
  { label: 'S', value: '33%' },
  { label: 'M', value: '50%' },
  { label: 'L', value: '75%' },
  { label: 'Full', value: '100%' },
]

// Extend the base Image node with `align` + `width` attributes so editors
// can position/resize images — rendered as inline style on the <img> tag,
// which is what both the admin preview and the Android WebView will read.
const AlignableImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attrs: any) => ({ style: `width:${attrs.width || '100%'};` }),
      },
      align: {
        default: 'left',
        renderHTML: (attrs: any) => {
          const align = attrs.align || 'left'
          const margin =
            align === 'center' ? '10px auto' : align === 'right' ? '10px 0 10px auto' : '10px auto 10px 0'
          return { style: `display:block;margin:${margin};` }
        },
      },
    }
  },
})

export type CaEditorMode = 'full' | 'inline' | 'inlineSingleLine'

export interface UseCaEditorOptions {
  mode: CaEditorMode
  value: string
  onChange: (html: string) => void
  onFocus?: () => void
  placeholder?: string
  /** Only consulted in 'full' mode — inline modes don't load the image extension at all. */
  uploadImage?: (file: File) => Promise<string>
}

/**
 * Creates a TipTap editor instance scoped to one of three extension sets:
 *  - 'full': everything (headings, lists, tables, images, alignment) — used
 *    for Full Article Content, the only field ever rendered outside a
 *    plain-text context (WebView / admin preview / PDF export).
 *  - 'inline' / 'inlineSingleLine': bold/italic/underline/strike/color/
 *    highlight/link only, no block structure. Used for Summary and
 *    Headline — both feed push notifications, share text, and list cards,
 *    none of which can render headings/tables/images, so those extensions
 *    are never even loaded for these fields (defense in depth alongside
 *    the server-side sanitizer, which strips them too).
 * 'inlineSingleLine' additionally blocks Enter from splitting a new
 * paragraph, since a headline is conceptually one line that wraps, not
 * multiple paragraphs.
 */
export function useCaEditor({ mode, value, onChange, onFocus, placeholder, uploadImage }: UseCaEditorOptions) {
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = useCallback(async (file: File, editor: Editor) => {
    if (!uploadImage) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url } as any).run()
    } catch (e) {
      console.error('Image upload failed', e)
    } finally {
      setUploading(false)
    }
  }, [uploadImage])

  const extensions = useMemo(() => {
    if (mode === 'full') {
      return [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        }),
        AlignableImage,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({ placeholder: placeholder || 'Write the full article here…' }),
      ]
    }
    // inline / inlineSingleLine — no headings, lists, blockquote, hr, code
    // block, image, table, or alignment. Just paragraph text + inline marks.
    return [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false,
        blockquote: false, horizontalRule: false, codeBlock: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: placeholder || '' }),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const editor = useEditor({
    extensions,
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => onFocus?.(),
    editorProps: {
      attributes: { class: mode === 'full' ? 'ca-editor-content' : 'ca-editor-content-inline' },
      handleKeyDown: mode === 'inlineSingleLine'
        ? (_view, event) => { if (event.key === 'Enter') return true; return false }
        : undefined,
      handlePaste: mode === 'full'
        ? (_view, event) => {
            const items = event.clipboardData?.items
            if (!items) return false
            for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile()
                if (file && editor) { handleImageUpload(file, editor); return true }
              }
            }
            return false
          }
        : undefined,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Keep editor content in sync when `value` changes from outside (e.g.
  // switching which article is being edited) — but don't fight the user
  // while they're actively typing in it.
  useEffect(() => {
    if (!editor) return
    const isFocused = editor.isFocused
    if (!isFocused && value !== editor.getHTML()) {
      // tiptap v2 signature: setContent(content, emitUpdate)
      editor.commands.setContent(value || '', false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  return { editor, uploading, handleImageUpload }
}

/** Shape passed from whichever CaEditorField is currently focused up to
 *  the shared CaToolbar, so the toolbar knows which editor to act on and
 *  which buttons make sense to show. */
export type ActiveCaEditor = {
  editor: Editor | null
  mode: CaEditorMode
  uploading: boolean
  onPickImage: () => void
} | null

export function CaEditorField({
  mode, value, onChange, placeholder, uploadImage, label, hint, onActivate,
}: {
  mode: CaEditorMode
  value: string
  onChange: (html: string) => void
  placeholder?: string
  uploadImage?: (file: File) => Promise<string>
  label: string
  hint?: string
  /** Called when this field becomes the active (focused) one, so the page can update the shared toolbar context. */
  onActivate: (ctx: ActiveCaEditor) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const { editor, uploading, handleImageUpload } = useCaEditor({
    mode, value, onChange, placeholder,
    uploadImage,
    onFocus: () => onActivate({ editor: editorRef.current, mode, uploading, onPickImage: () => fileInputRef.current?.click() }),
  })
  // onActivate above closes over `editor` from the previous render (hook
  // ordering), so keep a ref to always read the latest instance.
  useEffect(() => { editorRef.current = editor }, [editor])

  // Re-publish to the shared toolbar whenever this field's own uploading
  // state changes while it's the active one (e.g. mid image-upload).
  useEffect(() => {
    if (editor?.isFocused) onActivate({ editor, mode, uploading, onPickImage: () => fileInputRef.current?.click() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploading])

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        {label} {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </label>
      <div
        className={`border rounded-xl bg-white transition-colors ${editor?.isFocused ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'}`}
        onClick={() => editor?.commands.focus()}
      >
        {!editor ? (
          <div className={mode === 'full' ? 'h-48 animate-pulse bg-slate-50 rounded-xl' : 'h-11 animate-pulse bg-slate-50 rounded-xl'} />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
      {mode === 'full' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f && editor) handleImageUpload(f, editor); e.target.value = '' }}
        />
      )}
    </div>
  )
}

/** Single shared toolbar — operates on whichever CaEditorField was last
 *  focused. Inline-mark buttons (bold/color/highlight/link/undo/redo) are
 *  always shown; block-level buttons (headings/lists/align/image/table)
 *  only render when the active field is in 'full' mode, since inline
 *  fields never load those extensions and the buttons would no-op. */
export function CaToolbar({ active }: { active: ActiveCaEditor }) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const editor = active?.editor ?? null
  const isFull = active?.mode === 'full'

  const applyLink = useCallback(() => {
    if (!editor) return
    if (linkUrl.trim()) editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()
    else editor.chain().focus().unsetLink().run()
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const onAlign = useCallback((align: 'left' | 'center' | 'right') => {
    if (!editor) return
    if (editor.isActive('image')) editor.chain().focus().updateAttributes('image', { align }).run()
    else editor.chain().focus().setTextAlign(align).run()
  }, [editor])

  if (!editor) {
    return <div className="flex items-center p-1.5 border-b border-slate-100 bg-slate-50/60 h-10 text-xs text-slate-400 px-3">Click into any field below to format it</div>
  }

  const imageActive = isFull && editor.isActive('image')
  const tableActive = isFull && editor.isActive('table')

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-slate-100 bg-slate-50/60 relative sticky top-0 z-10">
      <ToolBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></ToolBtn>
      <ToolBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolBtn>
      <ToolBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolBtn>
      <ToolBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></ToolBtn>

      {isFull && (
        <>
          <Divider />
          <ToolBtn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></ToolBtn>
          <ToolBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></ToolBtn>
          <ToolBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={14} /></ToolBtn>
          <Divider />
          <ToolBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></ToolBtn>
          <ToolBtn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></ToolBtn>
          <ToolBtn title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></ToolBtn>
          <Divider />
          <ToolBtn title={imageActive ? 'Align image left' : 'Align text left'} active={imageActive ? editor.getAttributes('image').align === 'left' : editor.isActive({ textAlign: 'left' })} onClick={() => onAlign('left')}><AlignLeft size={14} /></ToolBtn>
          <ToolBtn title={imageActive ? 'Align image center' : 'Align text center'} active={imageActive ? editor.getAttributes('image').align === 'center' : editor.isActive({ textAlign: 'center' })} onClick={() => onAlign('center')}><AlignCenter size={14} /></ToolBtn>
          <ToolBtn title={imageActive ? 'Align image right' : 'Align text right'} active={imageActive ? editor.getAttributes('image').align === 'right' : editor.isActive({ textAlign: 'right' })} onClick={() => onAlign('right')}><AlignRight size={14} /></ToolBtn>
          {imageActive && (
            <>
              <Divider />
              {IMAGE_WIDTHS.map(w => (
                <button key={w.value} type="button"
                  onClick={() => editor.chain().focus().updateAttributes('image', { width: w.value }).run()}
                  title={`Image width ${w.value}`}
                  className={`px-1.5 h-7 rounded-lg text-[10px] font-bold transition-colors
                    ${editor.getAttributes('image').width === w.value ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {w.label}
                </button>
              ))}
            </>
          )}
        </>
      )}

      <Divider />

      <div className="relative">
        <ToolBtn title="Text color" onClick={() => { setShowColorPicker(v => !v); setShowHighlightPicker(false); setShowLinkInput(false) }}><Palette size={14} /></ToolBtn>
        {showColorPicker && (
          <Popover>
            {TEXT_COLORS.map(c => (
              <Swatch key={c} color={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }} />
            ))}
            <ClearSwatch onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false) }} />
          </Popover>
        )}
      </div>

      <div className="relative">
        <ToolBtn title="Highlight" active={editor.isActive('highlight')} onClick={() => { setShowHighlightPicker(v => !v); setShowColorPicker(false); setShowLinkInput(false) }}><Highlighter size={14} /></ToolBtn>
        {showHighlightPicker && (
          <Popover>
            {HIGHLIGHT_COLORS.map(c => (
              <Swatch key={c} color={c} onClick={() => { editor.chain().focus().setHighlight({ color: c } as any).run(); setShowHighlightPicker(false) }} />
            ))}
            <ClearSwatch onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false) }} />
          </Popover>
        )}
      </div>

      <Divider />

      <div className="relative">
        <ToolBtn title="Link" active={editor.isActive('link')} onClick={() => {
          setLinkUrl(editor.getAttributes('link').href || '')
          setShowLinkInput(v => !v); setShowColorPicker(false); setShowHighlightPicker(false)
        }}><LinkIcon size={14} /></ToolBtn>
        {showLinkInput && (
          <div className="absolute top-9 left-0 z-20 bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex items-center gap-1.5 w-64">
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://…"
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
              onKeyDown={e => { if (e.key === 'Enter') applyLink() }}
              autoFocus
            />
            <button type="button" onClick={applyLink} className="text-xs font-semibold text-brand-600 px-1.5 shrink-0">Set</button>
            {editor.isActive('link') && (
              <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false) }} className="text-red-500 shrink-0" title="Remove link">
                <Unlink size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {isFull && (
        <>
          <ToolBtn title="Insert image" onClick={() => active?.onPickImage()} disabled={active?.uploading}>
            {active?.uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          </ToolBtn>
          <ToolBtn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={14} /></ToolBtn>
          {tableActive && (
            <>
              <ToolBtn title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 size={14} /></ToolBtn>
              <ToolBtn title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 size={14} /></ToolBtn>
              <ToolBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 size={14} /></ToolBtn>
            </>
          )}
        </>
      )}

      <Divider />

      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo size={14} /></ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo size={14} /></ToolBtn>
    </div>
  )
}

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  uploadImage: (file: File) => Promise<string>
  placeholder?: string
}

/** Standalone single-field editor (toolbar + content together) — kept for
 *  any future use case that just needs one full-mode field on its own,
 *  without the multi-field shared-toolbar setup CaToolbar/CaEditorField
 *  are built for. */
export default function RichTextEditor({ value, onChange, uploadImage, placeholder }: RichTextEditorProps) {
  const [active, setActive] = useState<ActiveCaEditor>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { editor, uploading, handleImageUpload } = useCaEditor({
    mode: 'full', value, onChange, placeholder,
    uploadImage,
    onFocus: () => {},
  })

  useEffect(() => {
    setActive({ editor, mode: 'full', uploading, onPickImage: () => fileInputRef.current?.click() })
  }, [editor, uploading])

  if (!editor) return <div className="input h-48 animate-pulse bg-slate-50" />

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <CaToolbar active={active} />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, editor); e.target.value = '' }}
      />
      <CaEditorStyles />
    </div>
  )
}

export function CaEditorStyles() {
  return (
    <style jsx global>{`
      /* ── Editor container ─────────────────────────────────────────────── */
      .ca-editor-content { padding: 14px 16px; min-height: 220px; max-height: 480px; overflow-y: auto; font-size: 14px; line-height: 1.7; color: #1e293b; outline: none; }
      .ca-editor-content-inline { padding: 10px 14px; min-height: 44px; max-height: 140px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #1e293b; outline: none; }

      /* ── Paragraphs — high-specificity to override Tailwind base reset ── */
      .ca-editor-content > p,
      .ca-editor-content .ProseMirror > p,
      .ca-editor-content p { margin: 0 0 10px !important; }
      .ca-editor-content-inline > p,
      .ca-editor-content-inline .ProseMirror > p,
      .ca-editor-content-inline p { margin: 0 !important; }

      /* ── Headings ─────────────────────────────────────────────────────── */
      .ca-editor-content h1 { font-size: 1.5rem; font-weight: 800; margin: 18px 0 10px !important; color: #1565C0; }
      .ca-editor-content h2 { font-size: 1.25rem; font-weight: 800; margin: 16px 0 8px !important; color: #1565C0; }
      .ca-editor-content h3 { font-size: 1.1rem; font-weight: 700; margin: 14px 0 8px !important; color: #1565C0; }

      /* ── Lists — ROOT CAUSE FIX ──────────────────────────────────────── */
      /* Tailwind's base reset removes list-style-type, making bullets/numbers
         invisible even though <ul>/<ol>/<li> tags are correct. These rules
         explicitly restore the browser defaults inside the editor and preview. */
      .ca-editor-content ul,
      .ca-editor-content .ProseMirror ul {
        list-style-type: disc !important;
        padding-left: 1.6rem !important;
        margin: 0 0 10px !important;
      }
      .ca-editor-content ol,
      .ca-editor-content .ProseMirror ol {
        list-style-type: decimal !important;
        padding-left: 1.6rem !important;
        margin: 0 0 10px !important;
        counter-reset: list-counter;
      }
      .ca-editor-content ul li,
      .ca-editor-content .ProseMirror ul li {
        display: list-item !important;
        list-style-type: disc !important;
      }
      .ca-editor-content ol li,
      .ca-editor-content .ProseMirror ol li {
        display: list-item !important;
        list-style-type: decimal !important;
      }
      /* Nested lists */
      .ca-editor-content ul ul { list-style-type: circle !important; }
      .ca-editor-content ul ul ul { list-style-type: square !important; }
      .ca-editor-content ol ol { list-style-type: lower-alpha !important; }
      /* Paragraph inside list item — TipTap wraps li content in <p> */
      .ca-editor-content li > p { margin: 0 !important; }

      /* ── Same fixes for the content-view (admin preview) ─────────────── */
      .ca-content-view ul { list-style-type: disc !important; padding-left: 1.6rem !important; margin: 0 0 10px !important; }
      .ca-content-view ol { list-style-type: decimal !important; padding-left: 1.6rem !important; margin: 0 0 10px !important; }
      .ca-content-view ul li { display: list-item !important; list-style-type: disc !important; }
      .ca-content-view ol li { display: list-item !important; list-style-type: decimal !important; }
      .ca-content-view li > p { margin: 0 !important; }
      .ca-content-view ul ul { list-style-type: circle !important; }
      .ca-content-view ol ol { list-style-type: lower-alpha !important; }

      /* ── Blockquote ───────────────────────────────────────────────────── */
      .ca-editor-content blockquote { border-left: 3px solid #6366f1; padding: 4px 14px; margin: 10px 0 !important; background: #f5f5ff; border-radius: 0 8px 8px 0; color: #475569; font-style: italic; }
      .ca-content-view blockquote { border-left: 3px solid #6366f1; padding: 4px 14px; margin: 10px 0; background: #f5f5ff; border-radius: 0 8px 8px 0; color: #475569; font-style: italic; }

      /* ── Links ─────────────────────────────────────────────────────────── */
      .ca-editor-content a, .ca-editor-content-inline a { color: #2563eb; text-decoration: underline; }
      .ca-content-view a { color: #2563eb; text-decoration: underline; }

      /* ── Tables ─────────────────────────────────────────────────────────── */
      .ca-editor-content table { border-collapse: collapse; margin: 12px 0; width: 100%; }
      .ca-editor-content th, .ca-editor-content td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; min-width: 60px; }
      .ca-editor-content th { background: #f1f5f9; font-weight: 700; }
      .ca-content-view table { border-collapse: collapse; margin: 12px 0; width: 100%; }
      .ca-content-view th, .ca-content-view td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
      .ca-content-view th { background: #f1f5f9; font-weight: 700; }

      /* ── Images ─────────────────────────────────────────────────────────── */
      .ca-editor-content img { max-width: 100%; border-radius: 8px; }
      .ca-editor-content img.ProseMirror-selectednode { outline: 2px solid #6366f1; outline-offset: 2px; }

      /* ── Highlight / mark ───────────────────────────────────────────────── */
      .ca-editor-content mark, .ca-editor-content-inline mark { border-radius: 3px; padding: 0 2px; }

      /* ── Placeholder ─────────────────────────────────────────────────────── */
      .ca-editor-content p.is-editor-empty:first-child::before,
      .ca-editor-content-inline p.is-editor-empty:first-child::before {
        content: attr(data-placeholder); float: left; color: #94a3b8; pointer-events: none; height: 0;
      }

      /* ── Font size ───────────────────────────────────────────────────────── */
      .ca-content-view { font-size: 14px; line-height: 1.7; color: #1e293b; }
    `}</style>
  )
}

function ToolBtn({ active, onClick, title, children, disabled }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0
        ${active ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'}
        disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />
}

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute top-9 left-0 z-20 bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex gap-1.5">
      {children}
    </div>
  )
}

function Swatch({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-6 h-6 rounded-full border border-slate-200" style={{ background: color }} title={color} />
  )
}

function ClearSwatch({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-6 h-6 rounded-full border border-slate-300 bg-white text-[10px] flex items-center justify-center text-slate-400">
      ×
    </button>
  )
}
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
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

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  /** Upload a pasted/inserted image, returning its public URL. */
  uploadImage: (file: File) => Promise<string>
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, uploadImage, placeholder }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
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
    ],
    content: value || '',
    // Avoids the Next.js App Router SSR hydration warning TipTap throws
    // when the editor would otherwise render server-side first.
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'ca-editor-content' },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) { handleImageUpload(file); return true }
          }
        }
        return false
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep editor content in sync when `value` changes from outside (e.g.
  // switching which article is being edited) — but don't fight the user
  // while they're actively typing in it.
  useEffect(() => {
    if (!editor) return
    const isFocused = editor.isFocused
    if (!isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', {
        emitUpdate: false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url } as any).run()
    } catch (e) {
      console.error('Image upload failed', e)
    } finally {
      setUploading(false)
    }
  }, [editor, uploadImage])

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

  if (!editor) return <div className="input h-48 animate-pulse bg-slate-50" />

  const imageActive = editor.isActive('image')
  const tableActive = editor.isActive('table')

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-slate-100 bg-slate-50/60 relative">
        <ToolBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></ToolBtn>
        <ToolBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolBtn>
        <ToolBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></ToolBtn>

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

        <ToolBtn title="Insert image" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
        </ToolBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }}
        />

        <ToolBtn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={14} /></ToolBtn>
        {tableActive && (
          <>
            <ToolBtn title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 size={14} /></ToolBtn>
            <ToolBtn title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 size={14} /></ToolBtn>
            <ToolBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 size={14} /></ToolBtn>
          </>
        )}

        <Divider />

        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo size={14} /></ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo size={14} /></ToolBtn>
      </div>

      <EditorContent editor={editor} />

      <style jsx global>{`
        .ca-editor-content { padding: 14px 16px; min-height: 220px; max-height: 480px; overflow-y: auto; font-size: 14px; line-height: 1.7; color: #1e293b; outline: none; }
        .ca-editor-content p { margin: 0 0 10px; }
        .ca-editor-content h1 { font-size: 1.5rem; font-weight: 800; margin: 18px 0 10px; }
        .ca-editor-content h2 { font-size: 1.25rem; font-weight: 800; margin: 16px 0 8px; }
        .ca-editor-content h3 { font-size: 1.1rem; font-weight: 700; margin: 14px 0 8px; }
        .ca-editor-content ul, .ca-editor-content ol { padding-left: 1.4rem; margin: 0 0 10px; }
        .ca-editor-content blockquote { border-left: 3px solid #6366f1; padding: 4px 14px; margin: 10px 0; background: #f5f5ff; border-radius: 0 8px 8px 0; color: #475569; font-style: italic; }
        .ca-editor-content a { color: #2563eb; text-decoration: underline; }
        .ca-editor-content table { border-collapse: collapse; margin: 12px 0; width: 100%; }
        .ca-editor-content th, .ca-editor-content td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; min-width: 60px; }
        .ca-editor-content th { background: #f1f5f9; font-weight: 700; }
        .ca-editor-content img { max-width: 100%; border-radius: 8px; }
        .ca-editor-content img.ProseMirror-selectednode { outline: 2px solid #6366f1; outline-offset: 2px; }
        .ca-editor-content mark { border-radius: 3px; padding: 0 2px; }
        .ca-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder); float: left; color: #94a3b8; pointer-events: none; height: 0;
        }
      `}</style>
    </div>
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

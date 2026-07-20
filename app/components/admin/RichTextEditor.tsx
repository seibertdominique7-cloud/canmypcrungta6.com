'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { bodyToEditorHtml, richTextBody } from '../../lib/rich-text-shared';

export interface RichTextEditorHandle {
  focus: () => void;
  insertHtml: (html: string) => void;
}

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  format: string;
}
type ToggleToolbarKey = keyof Pick<ToolbarState, 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList'>;

const initialToolbarState: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  format: 'p',
};

export const RichTextEditor = forwardRef<RichTextEditorHandle, {
  body: string;
  disabled?: boolean;
  onChange: (body: string) => void;
}>(function RichTextEditor({ body, disabled = false, onChange }, forwardedRef) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastBodyRef = useRef(body);
  const lastEditorRangeRef = useRef<Range | null>(null);
  const pendingToolbarRef = useRef<Partial<Record<ToggleToolbarKey, boolean>>>({});
  const savedRangeRef = useRef<Range | null>(null);
  const [toolbar, setToolbar] = useState(initialToolbarState);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextBody = richTextBody(cleanEditorHtml(editor.innerHTML));
    lastBodyRef.current = nextBody;
    onChange(nextBody);
  }, [onChange]);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;
    if (selection.rangeCount) lastEditorRangeRef.current = selection.getRangeAt(0).cloneRange();
    const formatValue = String(document.queryCommandValue('formatBlock') || 'p').replace(/[<>]/g, '').toLowerCase();
    if (!selection.isCollapsed) pendingToolbarRef.current = {};
    const pending = pendingToolbarRef.current;
    setToolbar({
      bold: pending.bold ?? document.queryCommandState('bold'),
      italic: pending.italic ?? document.queryCommandState('italic'),
      underline: pending.underline ?? document.queryCommandState('underline'),
      strikeThrough: pending.strikeThrough ?? document.queryCommandState('strikeThrough'),
      insertUnorderedList: pending.insertUnorderedList ?? document.queryCommandState('insertUnorderedList'),
      insertOrderedList: pending.insertOrderedList ?? document.queryCommandState('insertOrderedList'),
      format: formatValue || 'p',
    });
  }, []);

  const insertHtml = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
    const range = validRange(lastEditorRangeRef.current, editor) ?? rangeAtEnd(editor);
    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = template.content;
    const lastNode = fragment.lastChild;
    range.deleteContents();
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      restoreRange(range);
      lastEditorRangeRef.current = range.cloneRange();
    }
    emitChange();
    updateToolbarState();
  }, [disabled, emitChange, updateToolbarState]);

  useImperativeHandle(forwardedRef, () => ({
    focus: () => editorRef.current?.focus(),
    insertHtml,
  }), [insertHtml]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || body === lastBodyRef.current) return;
    editor.innerHTML = bodyToEditorHtml(body);
    lastBodyRef.current = body;
  }, [body]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarState);
    return () => document.removeEventListener('selectionchange', updateToolbarState);
  }, [updateToolbarState]);

  const runCommand = (command: string, value?: string) => {
    if (disabled) return;
    const toggleKey = toolbarKeyForCommand(command);
    const wasActive = toggleKey ? toolbar[toggleKey] as boolean : false;
    editorRef.current?.focus();
    if (editorRef.current) restoreRange(validRange(lastEditorRangeRef.current, editorRef.current));
    document.execCommand(command, false, value);
    emitChange();
    updateToolbarState();
    if (toggleKey) {
      pendingToolbarRef.current[toggleKey] = !wasActive;
      setToolbar((current) => ({ ...current, [toggleKey]: !wasActive }));
    }
  };

  const openLinkEditor = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!editor) return;
    if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) {
      editor.focus();
      const fallbackRange = rangeAtEnd(editor);
      restoreRange(fallbackRange);
      savedRangeRef.current = fallbackRange.cloneRange();
      lastEditorRangeRef.current = fallbackRange.cloneRange();
      setLinkUrl('');
      setLinkOpen(true);
      return;
    }
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    lastEditorRangeRef.current = savedRangeRef.current.cloneRange();
    const element = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
    setLinkUrl(element?.closest('a')?.getAttribute('href') ?? '');
    setLinkOpen(true);
  };

  const restoreSelection = () => {
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!range || !selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const saveLink = () => {
    const value = normalizeLink(linkUrl);
    if (!value || !restoreSelection()) return;
    const selection = window.getSelection();
    if (selection?.isCollapsed) {
      insertHtml(`<a href="${escapeAttribute(value)}">${escapeHtml(value)}</a>`);
    } else {
      document.execCommand('createLink', false, value);
      emitChange();
    }
    setLinkOpen(false);
    setLinkUrl('');
  };

  const removeLink = () => {
    if (!restoreSelection()) return;
    document.execCommand('unlink');
    emitChange();
    setLinkOpen(false);
    setLinkUrl('');
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 shadow-inner shadow-black/20">
      <div aria-label="Text formatting" className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.035] p-2" role="toolbar">
        <select
          aria-label="Text style"
          className="mr-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs font-bold text-slate-200 outline-none focus:border-violet-400"
          disabled={disabled}
          onChange={(event) => runCommand('formatBlock', event.target.value)}
          value={['p', 'h1', 'h2', 'h3', 'h4'].includes(toolbar.format) ? toolbar.format : 'p'}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>
        <ToolButton active={toolbar.bold} disabled={disabled} label="Bold" onClick={() => runCommand('bold')}><strong>B</strong></ToolButton>
        <ToolButton active={toolbar.italic} disabled={disabled} label="Italic" onClick={() => runCommand('italic')}><em>I</em></ToolButton>
        <ToolButton active={toolbar.underline} disabled={disabled} label="Underline" onClick={() => runCommand('underline')}><u>U</u></ToolButton>
        <ToolButton active={toolbar.strikeThrough} disabled={disabled} label="Strikethrough" onClick={() => runCommand('strikeThrough')}><s>S</s></ToolButton>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
        <ToolButton active={toolbar.insertUnorderedList} disabled={disabled} label="Bulleted list" onClick={() => runCommand('insertUnorderedList')}>• List</ToolButton>
        <ToolButton active={toolbar.insertOrderedList} disabled={disabled} label="Numbered list" onClick={() => runCommand('insertOrderedList')}>1. List</ToolButton>
        <ToolButton disabled={disabled} label="Blockquote" onClick={() => runCommand('formatBlock', 'blockquote')}>Quote</ToolButton>
        <ToolButton disabled={disabled} label="Code block" onClick={() => runCommand('formatBlock', 'pre')}>Code</ToolButton>
        <ToolButton disabled={disabled} label="Horizontal rule" onClick={() => runCommand('insertHorizontalRule')}>—</ToolButton>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
        <ToolButton disabled={disabled} label="Add or edit link" onClick={openLinkEditor}>Link</ToolButton>
        <ToolButton disabled={disabled} label="Remove formatting" onClick={() => { runCommand('removeFormat'); runCommand('unlink'); }}>Clear</ToolButton>
      </div>

      {linkOpen ? (
        <div className="flex flex-wrap items-end gap-2 border-b border-white/10 bg-violet-500/10 p-3">
          <label className="min-w-56 flex-1 text-xs font-bold text-slate-300">
            Link URL
            <input
              autoFocus
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveLink(); } if (event.key === 'Escape') setLinkOpen(false); }}
              placeholder="https://example.com or /articles/guide"
              value={linkUrl}
            />
          </label>
          <button className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-black text-white hover:bg-violet-400" onClick={saveLink} type="button">Save link</button>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5" onClick={removeLink} type="button">Remove</button>
          <button className="rounded-lg px-3 py-2 text-xs font-bold text-slate-400 hover:text-white" onClick={() => setLinkOpen(false)} type="button">Cancel</button>
        </div>
      ) : null}

      <div
        aria-label="Content body"
        aria-multiline="true"
        className="cms-admin-editor min-h-[460px] px-5 py-4 text-base leading-8 text-slate-200 outline-none [&_a]:font-bold [&_a]:text-violet-300 [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-400 [&_blockquote]:bg-violet-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_cms-affiliate]:my-4 [&_cms-affiliate]:grid [&_cms-affiliate]:cursor-default [&_cms-affiliate]:gap-1 [&_cms-affiliate]:rounded-xl [&_cms-affiliate]:border [&_cms-affiliate]:border-emerald-400/30 [&_cms-affiliate]:bg-emerald-500/10 [&_cms-affiliate]:p-4 [&_cms-affiliate_span]:text-emerald-100 [&_cms-affiliate_small]:text-emerald-300/70 [&_cms-block]:my-4 [&_cms-block]:grid [&_cms-block]:cursor-default [&_cms-block]:gap-1 [&_cms-block]:rounded-xl [&_cms-block]:border [&_cms-block]:border-cyan-400/25 [&_cms-block]:bg-cyan-500/10 [&_cms-block]:p-4 [&_figure]:my-5 [&_figure]:rounded-2xl [&_figure]:border [&_figure]:border-white/10 [&_figure]:bg-black/20 [&_figure]:p-3 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-slate-400 [&_h1]:my-4 [&_h1]:text-3xl [&_h1]:font-black [&_h2]:my-4 [&_h2]:text-2xl [&_h2]:font-black [&_h3]:my-3 [&_h3]:text-xl [&_h3]:font-black [&_h4]:my-3 [&_h4]:text-lg [&_h4]:font-black [&_hr]:my-6 [&_hr]:border-white/10 [&_img]:mx-auto [&_img]:max-h-[520px] [&_img]:max-w-full [&_img]:rounded-xl [&_img]:object-contain [&_li]:ml-6 [&_ol]:list-decimal [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/50 [&_pre]:p-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:p-2 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:p-2 [&_ul]:list-disc"
        contentEditable={!disabled}
        dangerouslySetInnerHTML={{ __html: bodyToEditorHtml(body) }}
        onBlur={updateToolbarState}
        onInput={emitChange}
        onKeyUp={() => { pendingToolbarRef.current = {}; updateToolbarState(); }}
        onMouseUp={() => { pendingToolbarRef.current = {}; updateToolbarState(); }}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData('text/html');
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertHTML', false, html ? cleanEditorHtml(html) : plainTextToHtml(text));
          emitChange();
        }}
        ref={editorRef}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
});

function ToolButton({ active = false, disabled = false, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} aria-pressed={active} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${active ? 'border-violet-300/50 bg-violet-500/25 text-white' : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white'}`} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick} title={label} type="button">{children}</button>;
}

export function cleanEditorHtml(source: string) {
  if (typeof DOMParser === 'undefined') return source;
  const documentValue = new DOMParser().parseFromString(source, 'text/html');
  documentValue.querySelectorAll('script,style,meta,link,iframe,object,embed').forEach((node) => node.remove());
  cleanNode(documentValue.body);
  return documentValue.body.innerHTML.trim() || '<p><br></p>';
}

const allowedElements = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'FIGURE', 'FIGCAPTION', 'IMG', 'DIV', 'SPAN', 'CMS-AFFILIATE', 'CMS-BLOCK']);

function cleanNode(root: Element) {
  for (const child of Array.from(root.children)) {
    cleanNode(child);
    const element = child as HTMLElement;
    const style = element.getAttribute('style') ?? '';
    wrapStyledContent(element, style);
    if (!allowedElements.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!allowedAttribute(element.tagName, attribute.name, attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A') {
      const href = normalizeLink(element.getAttribute('href') ?? '');
      if (href) element.setAttribute('href', href); else element.replaceWith(...Array.from(element.childNodes));
    }
    if ((element.tagName === 'B' || element.tagName === 'I' || element.tagName === 'DEL') && element.parentElement) {
      const semantic = document.createElement(element.tagName === 'B' ? 'strong' : element.tagName === 'I' ? 'em' : 's');
      semantic.append(...Array.from(element.childNodes));
      element.replaceWith(semantic);
    }
    if (element.tagName === 'SPAN' && !element.attributes.length) element.replaceWith(...Array.from(element.childNodes));
  }
}

function wrapStyledContent(element: HTMLElement, style: string) {
  const wrappers: string[] = [];
  if (/font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style)) wrappers.push('strong');
  if (/font-style\s*:\s*italic/i.test(style)) wrappers.push('em');
  if (/text-decoration[^;]*(?:underline)/i.test(style)) wrappers.push('u');
  if (/text-decoration[^;]*(?:line-through)/i.test(style)) wrappers.push('s');
  for (const tag of wrappers) {
    const wrapper = document.createElement(tag);
    wrapper.append(...Array.from(element.childNodes));
    element.append(wrapper);
  }
}

function allowedAttribute(tag: string, name: string, value: string) {
  const lower = name.toLowerCase();
  if (tag === 'A') return ['href', 'title'].includes(lower);
  if (tag === 'IMG') return ['src', 'alt', 'title', 'width', 'height', 'loading'].includes(lower) && (lower !== 'src' || safeMediaUrl(value));
  if (tag === 'FIGURE') return ['data-cms-image', 'data-align', 'data-size', 'contenteditable'].includes(lower);
  if (tag === 'TH' || tag === 'TD') return ['colspan', 'rowspan', 'scope'].includes(lower);
  if (tag === 'CMS-AFFILIATE') return ['product-id', 'contenteditable'].includes(lower);
  if (tag === 'CMS-BLOCK') return ['kind', 'argument', 'contenteditable'].includes(lower);
  return false;
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  if (/^(?:https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

function safeMediaUrl(value: string) {
  return (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\//i.test(value);
}

function plainTextToHtml(value: string) {
  return value.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value.replace(/[\r\n]+/g, ' '));
}

function restoreRange(range: Range | null) {
  const selection = window.getSelection();
  if (!range || !selection) return false;
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function validRange(range: Range | null, editor: HTMLElement) {
  if (!range || !editor.contains(range.commonAncestorContainer)) return null;
  return range;
}

function rangeAtEnd(editor: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
}

function toolbarKeyForCommand(command: string): ToggleToolbarKey | null {
  if (command === 'bold' || command === 'italic' || command === 'underline' || command === 'strikeThrough' || command === 'insertUnorderedList' || command === 'insertOrderedList') return command;
  return null;
}

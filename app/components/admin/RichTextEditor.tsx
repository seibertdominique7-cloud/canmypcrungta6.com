/* eslint-disable @next/next/no-img-element -- Affiliate product thumbnails use admin-managed runtime URLs. */
'use client';

import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { AFFILIATE_LINK_REL, bodyToEditorHtml, richTextBody, type RichTextProductSummary } from '../../lib/rich-text-shared';

export interface RichTextEditorHandle {
  focus: () => void;
  insertHtml: (html: string) => void;
}

type TextAlignment = 'left' | 'center' | 'right';
type TextSize = 'small' | 'normal' | 'large' | 'x-large';
type LinkMode = 'manual' | 'product';

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  format: string;
  alignment: TextAlignment;
  textSize: TextSize;
}

interface ActiveBlockState {
  index: number;
  label: string;
  productId: string | null;
  total: number;
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
  alignment: 'left',
  textSize: 'normal',
};

export const RichTextEditor = forwardRef<RichTextEditorHandle, {
  body: string;
  disabled?: boolean;
  onChange: (body: string) => void;
  onEditAffiliateProduct?: (productId: string) => void;
  products?: RichTextProductSummary[];
}>(function RichTextEditor({ body, disabled = false, onChange, onEditAffiliateProduct, products = [] }, forwardedRef) {
  const editorRef = useRef<HTMLDivElement>(null);
  const activeBlockRef = useRef<HTMLElement | null>(null);
  const lastBodyRef = useRef<string | null>(null);
  const lastEditorRangeRef = useRef<Range | null>(null);
  const pendingToolbarRef = useRef<Partial<Record<ToggleToolbarKey, boolean>>>({});
  const savedRangeRef = useRef<Range | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);
  const lastClickedLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [activeBlock, setActiveBlock] = useState<ActiveBlockState | null>(null);
  const [toolbar, setToolbar] = useState(initialToolbarState);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkExisting, setLinkExisting] = useState(false);
  const [linkMode, setLinkMode] = useState<LinkMode>('manual');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [linkSponsored, setLinkSponsored] = useState(false);
  const [linkNofollow, setLinkNofollow] = useState(false);
  const [linkNoopener, setLinkNoopener] = useState(false);
  const [linkProductId, setLinkProductId] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkRetailer, setLinkRetailer] = useState('all');
  const [linkCategory, setLinkCategory] = useState('all');
  const [linkError, setLinkError] = useState('');
  const linkRetailers = useMemo(() => Array.from(new Set(products.map((product) => product.retailer))).sort(), [products]);
  const linkCategories = useMemo(() => Array.from(new Set(products.map((product) => product.componentType))).sort(), [products]);
  const visibleLinkProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.title} ${product.retailer} ${product.componentType}`.toLowerCase().includes(linkSearch.trim().toLowerCase());
    return matchesSearch && (linkRetailer === 'all' || product.retailer === linkRetailer) && (linkCategory === 'all' || product.componentType === linkCategory);
  }), [linkCategory, linkRetailer, linkSearch, products]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextBody = richTextBody(cleanEditorHtml(editor.innerHTML));
    lastBodyRef.current = nextBody;
    onChange(nextBody);
  }, [onChange]);

  const setActiveBlockFromNode = useCallback((node: Node | null) => {
    const editor = editorRef.current;
    if (!editor) return null;
    const block = directEditorChild(node, editor);
    if (!block) return null;
    if (activeBlockRef.current !== block) {
      activeBlockRef.current?.removeAttribute('data-editor-active');
      block.setAttribute('data-editor-active', 'true');
      activeBlockRef.current = block;
    }
    const children = Array.from(editor.children) as HTMLElement[];
    const index = children.indexOf(block);
    const nextState = {
      index,
      label: editorBlockLabel(block),
      productId: block.tagName === 'CMS-AFFILIATE' ? block.getAttribute('product-id') : null,
      total: children.length,
    };
    setActiveBlock((current) => sameActiveBlock(current, nextState) ? current : nextState);
    return block;
  }, []);

  const captureSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode)) return null;
    const range = selection.getRangeAt(0).cloneRange();
    lastEditorRangeRef.current = range;
    return range;
  }, []);

  const rememberSelection = useCallback(() => {
    const range = captureSelection();
    const selection = window.getSelection();
    if (range?.collapsed && selection?.anchorNode) setActiveBlockFromNode(selection.anchorNode);
    return range;
  }, [captureSelection, setActiveBlockFromNode]);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;
    const range = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    if (range) lastEditorRangeRef.current = range;
    if (!selection.isCollapsed) return;
    const block = setActiveBlockFromNode(selection.anchorNode);
    const formatValue = block?.tagName.toLowerCase() ?? String(document.queryCommandValue('formatBlock') || 'p').replace(/[<>]/g, '').toLowerCase();
    if (!selection.isCollapsed) pendingToolbarRef.current = {};
    const pending = pendingToolbarRef.current;
    const nextToolbar: ToolbarState = {
      bold: pending.bold ?? document.queryCommandState('bold'),
      italic: pending.italic ?? document.queryCommandState('italic'),
      underline: pending.underline ?? document.queryCommandState('underline'),
      strikeThrough: pending.strikeThrough ?? document.queryCommandState('strikeThrough'),
      insertUnorderedList: pending.insertUnorderedList ?? document.queryCommandState('insertUnorderedList'),
      insertOrderedList: pending.insertOrderedList ?? document.queryCommandState('insertOrderedList'),
      format: ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(formatValue) ? formatValue : 'p',
      alignment: alignmentForBlock(block),
      textSize: textSizeForBlock(block),
    };
    setToolbar((current) => sameToolbarState(current, nextToolbar) ? current : nextToolbar);
  }, [setActiveBlockFromNode]);

  const insertHtml = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus({ preventScroll: true });
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
      setActiveBlockFromNode(lastNode);
    }
    emitChange();
    updateToolbarState();
  }, [disabled, emitChange, setActiveBlockFromNode, updateToolbarState]);

  useImperativeHandle(forwardedRef, () => ({
    focus: () => editorRef.current?.focus({ preventScroll: true }),
    insertHtml,
  }), [insertHtml]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || body === lastBodyRef.current) return;
    editor.innerHTML = bodyToEditorHtml(body);
    lastBodyRef.current = body;
    activeBlockRef.current = null;
    setActiveBlock(null);
  }, [body]);

  useEffect(() => {
    document.addEventListener('selectionchange', captureSelection);
    return () => document.removeEventListener('selectionchange', captureSelection);
  }, [captureSelection]);

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    editor.focus({ preventScroll: true });
    const range = validRange(lastEditorRangeRef.current, editor) ?? rangeAtEnd(editor);
    restoreRange(range);
    return range;
  };

  const runCommand = (command: string, value?: string) => {
    if (disabled) return;
    const range = restoreEditorSelection();
    if (!range) return;
    const toggleKey = toolbarKeyForCommand(command);
    const wasActive = toggleKey ? document.queryCommandState(command) || toolbar[toggleKey] as boolean : false;
    const inlineTag = inlineTagForCommand(command);
    const editor = editorRef.current;
    const wrapped = Boolean(inlineTag && editor && !range.collapsed && !wasActive && wrapSelection(range, inlineTag, editor));
    if (!wrapped) document.execCommand(command, false, value);
    rememberSelection();
    emitChange();
    updateToolbarState();
    if (toggleKey) {
      const nextActive = wrapped || !wasActive;
      pendingToolbarRef.current[toggleKey] = nextActive;
      setToolbar((current) => ({ ...current, [toggleKey]: nextActive }));
    }
  };

  const applyBlockSetting = (attribute: 'data-align' | 'data-text-size', value: TextAlignment | TextSize) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    const range = restoreEditorSelection();
    const blocks = range ? editorBlocksForRange(editor, range) : [];
    if (!blocks.length && activeBlockRef.current) blocks.push(activeBlockRef.current);
    const defaultValue = attribute === 'data-align' ? 'left' : 'normal';
    for (const block of blocks) {
      if (value === defaultValue) block.removeAttribute(attribute);
      else block.setAttribute(attribute, value);
    }
    emitChange();
    updateToolbarState();
  };

  const mutateActiveBlock = (action: 'move-up' | 'move-down' | 'duplicate' | 'delete') => {
    const editor = editorRef.current;
    const block = activeBlockRef.current;
    if (!editor || !block || block.parentElement !== editor || disabled) return;
    let nextActive: HTMLElement | null = block;
    if (action === 'move-up' && block.previousElementSibling) {
      editor.insertBefore(block, block.previousElementSibling);
    } else if (action === 'move-down' && block.nextElementSibling) {
      block.nextElementSibling.after(block);
    } else if (action === 'duplicate') {
      const clone = block.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-editor-active');
      block.after(clone);
      nextActive = clone;
    } else if (action === 'delete') {
      nextActive = (block.nextElementSibling ?? block.previousElementSibling) as HTMLElement | null;
      block.remove();
      if (!editor.children.length) {
        const paragraph = document.createElement('p');
        paragraph.append(document.createElement('br'));
        editor.append(paragraph);
        nextActive = paragraph;
      }
    } else {
      return;
    }
    activeBlockRef.current?.removeAttribute('data-editor-active');
    activeBlockRef.current = null;
    if (nextActive) {
      setActiveBlockFromNode(nextActive);
      placeCaretForBlock(nextActive, editor);
    }
    emitChange();
    updateToolbarState();
  };

  const closeLinkEditor = () => {
    setLinkOpen(false);
    setLinkError('');
    setLinkSearch('');
    setLinkExisting(false);
    activeLinkRef.current = null;
    lastClickedLinkRef.current = null;
  };

  const openLinkEditor = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!editor) return;
    let range = selection?.rangeCount && selection.anchorNode && editor.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange()
      : validRange(lastEditorRangeRef.current, editor) ?? rangeAtEnd(editor);
    const clickedLink = lastClickedLinkRef.current;
    const link = clickedLink && editor.contains(clickedLink) ? clickedLink : closestLink(range.startContainer, editor);
    if (link && range.collapsed) {
      range = document.createRange();
      range.selectNodeContents(link);
    }
    savedRangeRef.current = range.cloneRange();
    lastEditorRangeRef.current = range.cloneRange();
    activeLinkRef.current = link;
    setLinkExisting(Boolean(link));
    const href = link?.getAttribute('href') ?? '';
    const rel = new Set((link?.getAttribute('rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean));
    const savedProductId = link?.getAttribute('data-affiliate-product-id') ?? '';
    const linkedProduct = products.find((product) => product.id === savedProductId)
      ?? products.find((product) => href && product.affiliateUrl === href);
    const affiliate = link?.getAttribute('data-link-kind') === 'affiliate' || Boolean(linkedProduct);
    setLinkMode(affiliate ? 'product' : 'manual');
    setLinkUrl(href);
    setLinkNewTab(link?.getAttribute('target') === '_blank');
    setLinkSponsored(rel.has('sponsored'));
    setLinkNofollow(rel.has('nofollow'));
    setLinkNoopener(rel.has('noopener'));
    setLinkProductId(linkedProduct?.id ?? savedProductId);
    setLinkError('');
    setLinkOpen(true);
  };

  const restoreSavedSelection = () => {
    const range = savedRangeRef.current;
    const editor = editorRef.current;
    if (!range || !editor || !validRange(range, editor)) return false;
    editor.focus({ preventScroll: true });
    return restoreRange(range);
  };

  const applyLink = (href: string, attributes: Record<string, string>) => {
    const editor = editorRef.current;
    if (!editor) return false;
    const existingLink = activeLinkRef.current;
    if (existingLink && editor.contains(existingLink)) {
      setAnchorAttributes(existingLink, href, attributes);
      const range = document.createRange();
      range.selectNodeContents(existingLink);
      restoreRange(range);
      lastEditorRangeRef.current = range.cloneRange();
      rememberSelection();
      emitChange();
      return true;
    }
    if (!restoreSavedSelection()) return false;
    const selection = window.getSelection();
    if (selection?.isCollapsed) {
      const htmlAttributes = Object.entries({ href, ...attributes }).map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join('');
      insertHtml(`<a${htmlAttributes}>${escapeHtml(href)}</a>`);
      return true;
    }
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !wrapSelection(range, 'a', editor, { href, ...attributes })) {
      setLinkError('Select linked text within a single paragraph or heading, then try again.');
      return false;
    }
    rememberSelection();
    emitChange();
    return true;
  };

  const saveManualLink = () => {
    const value = normalizeLink(linkUrl);
    if (!value) {
      setLinkError('Enter a valid internal path, http(s) URL, or mailto link.');
      return;
    }
    const rel = Array.from(new Set([
      ...(linkSponsored ? ['sponsored'] : []),
      ...(linkNofollow ? ['nofollow'] : []),
      ...((linkNoopener || linkNewTab) ? ['noopener'] : []),
    ])).join(' ');
    if (applyLink(value, { ...(linkNewTab ? { target: '_blank' } : {}), ...(rel ? { rel } : {}) })) closeLinkEditor();
  };

  const saveProductLink = () => {
    const product = products.find((item) => item.id === linkProductId);
    if (!product) {
      setLinkError('Choose a product from the library. The existing URL has not been changed.');
      return;
    }
    if (!product.enabled) {
      setLinkError('This product is disabled. Enable it in Affiliate Products or choose another product.');
      return;
    }
    if (!isSupportedLink(product.affiliateUrl)) {
      setLinkError('This product is missing a valid affiliate URL. Update it in Affiliate Products before inserting it.');
      return;
    }
    const external = isExternalLink(product.affiliateUrl);
    if (applyLink(product.affiliateUrl, {
      'data-link-kind': 'affiliate',
      'data-affiliate-product-id': product.id,
      ...(external ? { rel: AFFILIATE_LINK_REL } : linkNewTab ? { rel: 'noopener' } : {}),
      ...(linkNewTab ? { target: '_blank' } : {}),
    })) closeLinkEditor();
  };

  const removeLink = () => {
    const editor = editorRef.current;
    const existingLink = activeLinkRef.current;
    if (editor && existingLink && editor.contains(existingLink)) unwrapElement(existingLink);
    else if (restoreSavedSelection()) document.execCommand('unlink');
    else return;
    rememberSelection();
    emitChange();
    closeLinkEditor();
  };

  const currentLinkedProduct = products.find((product) => product.id === linkProductId);

  const latestSurfaceHandlersRef = useRef({ emitChange, rememberSelection, updateToolbarState });
  useEffect(() => {
    latestSurfaceHandlersRef.current = { emitChange, rememberSelection, updateToolbarState };
  }, [emitChange, rememberSelection, updateToolbarState]);
  const handleSurfaceSelection = useCallback(() => { latestSurfaceHandlersRef.current.rememberSelection(); }, []);
  const handleSurfaceInput = useCallback(() => {
    lastClickedLinkRef.current = null;
    latestSurfaceHandlersRef.current.rememberSelection();
    latestSurfaceHandlersRef.current.emitChange();
  }, []);
  const handleSurfaceToolbarUpdate = useCallback(() => {
    pendingToolbarRef.current = {};
    const selection = window.getSelection();
    latestSurfaceHandlersRef.current.rememberSelection();
    if (selection?.isCollapsed) latestSurfaceHandlersRef.current.updateToolbarState();
  }, []);
  const handleSurfacePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html ? cleanEditorHtml(html) : plainTextToHtml(text));
    latestSurfaceHandlersRef.current.rememberSelection();
    latestSurfaceHandlersRef.current.emitChange();
  }, []);
  const handleSurfaceBlockClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (editor) lastClickedLinkRef.current = closestLink(event.target as Node, editor);
    const block = editor ? directEditorChild(event.target as Node, editor) : null;
    const selection = window.getSelection();
    const nonEditableBlock = block && (block.getAttribute('contenteditable') === 'false' || ['CMS-AFFILIATE', 'CMS-BLOCK', 'FIGURE', 'HR'].includes(block.tagName));
    if (nonEditableBlock || selection?.isCollapsed) setActiveBlockFromNode(event.target as Node);
  }, [setActiveBlockFromNode]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 shadow-inner shadow-black/20 focus-within:border-violet-400/35">
      <div aria-label="Text formatting" className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-white/10 bg-slate-950/95 p-2 shadow-lg shadow-black/20 backdrop-blur-xl" role="toolbar">
        <select
          aria-label="Text style"
          className="mr-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs font-bold text-slate-200 outline-none focus:border-violet-400"
          disabled={disabled}
          onChange={(event) => runCommand('formatBlock', event.target.value)}
          onPointerDown={rememberSelection}
          value={['p', 'h1', 'h2', 'h3', 'h4'].includes(toolbar.format) ? toolbar.format : 'p'}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
        </select>
        <select
          aria-label="Text size"
          className="mr-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs font-bold text-slate-200 outline-none focus:border-violet-400"
          disabled={disabled}
          onChange={(event) => applyBlockSetting('data-text-size', event.target.value as TextSize)}
          onPointerDown={rememberSelection}
          value={toolbar.textSize}
        >
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="x-large">Extra Large</option>
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
        <ToolButton active={toolbar.alignment === 'left'} disabled={disabled} label="Align left" onClick={() => applyBlockSetting('data-align', 'left')}>Left</ToolButton>
        <ToolButton active={toolbar.alignment === 'center'} disabled={disabled} label="Align center" onClick={() => applyBlockSetting('data-align', 'center')}>Center</ToolButton>
        <ToolButton active={toolbar.alignment === 'right'} disabled={disabled} label="Align right" onClick={() => applyBlockSetting('data-align', 'right')}>Right</ToolButton>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
        <ToolButton disabled={disabled} label="Add or edit link" onClick={openLinkEditor}>Link</ToolButton>
        <ToolButton disabled={disabled} label="Remove formatting" onClick={() => { runCommand('removeFormat'); runCommand('unlink'); }}>Clear</ToolButton>
      </div>

      {linkOpen ? (
        <div aria-labelledby="article-link-dialog-title" aria-modal="true" className="fixed inset-0 z-[110] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onKeyDown={(event) => { if (event.key === 'Escape') closeLinkEditor(); }} role="dialog">
          <div className="mx-auto my-8 max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-[#0d111d] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Article hyperlink</p>
                <h2 className="mt-1 text-xl font-black text-white" id="article-link-dialog-title">{linkExisting ? 'Edit hyperlink' : 'Insert hyperlink'}</h2>
                <p className="mt-1 text-sm text-slate-400">The selected article text and its formatting will stay intact.</p>
              </div>
              <button className={dialogSecondaryButton} onClick={closeLinkEditor} type="button">Close</button>
            </div>

            <div aria-label="Link source" className="grid grid-cols-2 border-b border-white/10 bg-black/20 p-2" role="tablist">
              <button aria-selected={linkMode === 'manual'} className={linkTabClass(linkMode === 'manual')} onClick={() => { setLinkMode('manual'); setLinkError(''); }} role="tab" type="button">Paste Link Manually</button>
              <button aria-selected={linkMode === 'product'} className={linkTabClass(linkMode === 'product')} onClick={() => { setLinkMode('product'); setLinkError(''); }} role="tab" type="button">Product Library</button>
            </div>

            <div className="grid gap-5 p-5">
              {linkMode === 'manual' ? (
                <div className="grid gap-4">
                  <label className={dialogLabelClass}>
                    Manual URL
                    <input
                      autoFocus
                      className={dialogInputClass}
                      onChange={(event) => { setLinkUrl(event.target.value); setLinkError(''); }}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveManualLink(); } }}
                      placeholder="https://example.com or /articles/guide"
                      value={linkUrl}
                    />
                  </label>
                  <label className={dialogCheckboxClass}><input checked={linkNewTab} className="size-4 accent-violet-500" onChange={(event) => { setLinkNewTab(event.target.checked); if (event.target.checked) setLinkNoopener(true); }} type="checkbox" />Open in a new tab</label>
                  <fieldset className="rounded-2xl border border-white/10 p-4">
                    <legend className="px-2 text-xs font-black uppercase tracking-wide text-slate-400">Relationship attributes</legend>
                    <div className="mt-1 grid gap-3 sm:grid-cols-3">
                      <label className={dialogCheckboxClass}><input checked={linkSponsored} className="size-4 accent-violet-500" onChange={(event) => setLinkSponsored(event.target.checked)} type="checkbox" />sponsored</label>
                      <label className={dialogCheckboxClass}><input checked={linkNofollow} className="size-4 accent-violet-500" onChange={(event) => setLinkNofollow(event.target.checked)} type="checkbox" />nofollow</label>
                      <label className={dialogCheckboxClass}><input checked={linkNoopener || linkNewTab} className="size-4 accent-violet-500" disabled={linkNewTab} onChange={(event) => setLinkNoopener(event.target.checked)} type="checkbox" />noopener{linkNewTab ? ' (required for new tabs)' : ''}</label>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">Internal links are not marked sponsored automatically. New-tab links always keep noopener for safety.</p>
                  </fieldset>
                </div>
              ) : (
                <div className="grid gap-4">
                  {linkProductId ? (
                    currentLinkedProduct ? (
                      <div className={`rounded-2xl border p-3 ${currentLinkedProduct.enabled && isSupportedLink(currentLinkedProduct.affiliateUrl) ? 'border-emerald-400/25 bg-emerald-500/10' : 'border-amber-400/30 bg-amber-500/10'}`}>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Linked product</p>
                        <p className="mt-1 font-black text-white">{currentLinkedProduct.title}</p>
                        <p className="mt-1 text-xs text-slate-300">{currentLinkedProduct.enabled ? 'Enabled' : 'Disabled'} · {currentLinkedProduct.affiliateUrl ? 'Affiliate URL saved' : 'Affiliate URL missing'}</p>
                        <a className="mt-2 inline-flex text-xs font-black text-violet-200 underline underline-offset-4" href="/admin/products" rel="noopener" target="_blank">View linked product in library</a>
                        {!currentLinkedProduct.enabled || !isSupportedLink(currentLinkedProduct.affiliateUrl) ? <p className="mt-2 text-xs leading-5 text-amber-200">Warning: this product cannot be newly inserted. The article&apos;s previously saved URL remains unchanged until you replace or remove the link.</p> : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">Warning: the linked product was deleted or is no longer available. The saved article URL is preserved. Choose a replacement or remove the hyperlink.</div>
                    )
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_170px]">
                    <label className={dialogLabelClass}>Search products<input autoFocus className={dialogInputClass} onChange={(event) => setLinkSearch(event.target.value)} placeholder="RTX 4060" value={linkSearch} /></label>
                    <label className={dialogLabelClass}>Retailer<select className={dialogInputClass} onChange={(event) => setLinkRetailer(event.target.value)} value={linkRetailer}><option value="all">All retailers</option>{linkRetailers.map((retailer) => <option key={retailer}>{retailer}</option>)}</select></label>
                    <label className={dialogLabelClass}>Category<select className={dialogInputClass} onChange={(event) => setLinkCategory(event.target.value)} value={linkCategory}><option value="all">All categories</option>{linkCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                  </div>

                  <div className="grid max-h-[44vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {visibleLinkProducts.map((product) => {
                      const usable = product.enabled && isSupportedLink(product.affiliateUrl);
                      const selected = product.id === linkProductId;
                      return (
                        <article className={`flex min-h-36 gap-3 rounded-2xl border p-3 transition ${selected ? 'border-violet-400/60 bg-violet-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`} key={product.id}>
                          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/35">
                            {product.imageUrl ? <img alt="" className="h-full w-full object-contain p-1" src={product.imageUrl} /> : <span className="px-2 text-center text-[10px] font-black uppercase text-slate-600">No image</span>}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <p className="line-clamp-2 font-black leading-5 text-white">{product.title}</p>
                            <p className="mt-1 text-xs text-slate-400">{product.retailer} · {product.componentType}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black uppercase">
                              <span className="rounded-full bg-violet-500/15 px-2 py-1 text-violet-200">{product.badge && product.badge !== 'None' ? product.badge : 'No badge'}</span>
                              <span className={`rounded-full px-2 py-1 ${product.affiliateUrl ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>{product.affiliateUrl ? 'URL ready' : 'No URL'}</span>
                              <span className={`rounded-full px-2 py-1 ${product.enabled ? 'bg-cyan-500/15 text-cyan-200' : 'bg-amber-500/15 text-amber-200'}`}>{product.enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            <button className={`${selected ? dialogSelectedButton : usable ? dialogPrimaryButton : dialogSecondaryButton} mt-auto w-full`} disabled={!usable} onClick={() => { setLinkProductId(product.id); setLinkUrl(product.affiliateUrl); setLinkNewTab(isExternalLink(product.affiliateUrl)); setLinkError(''); }} type="button">{selected ? 'Selected' : usable ? 'Select product' : 'Unavailable'}</button>
                          </div>
                        </article>
                      );
                    })}
                    {!visibleLinkProducts.length ? <p className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No products match these filters.</p> : null}
                  </div>
                  <label className={dialogCheckboxClass}><input checked={linkNewTab} className="size-4 accent-violet-500" onChange={(event) => setLinkNewTab(event.target.checked)} type="checkbox" />Open affiliate link in a new tab</label>
                  <p className="text-xs leading-5 text-slate-500">External affiliate links use the exact saved product URL and include rel=&quot;{AFFILIATE_LINK_REL}&quot;. Internal links are not marked sponsored.</p>
                </div>
              )}

              {linkError ? <p aria-live="assertive" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{linkError}</p> : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
                {linkExisting ? <button className={dialogDangerButton} onClick={removeLink} type="button">Remove hyperlink</button> : null}
                <button className={dialogSecondaryButton} onClick={closeLinkEditor} type="button">Cancel</button>
                <button className={dialogPrimaryButton} onClick={linkMode === 'manual' ? saveManualLink : saveProductLink} type="button">{linkExisting ? 'Update link' : 'Insert link'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.025] px-3 py-2">
        <p aria-live="polite" className="text-xs text-slate-400">
          {activeBlock ? <><span className="font-black text-slate-200">{activeBlock.label}</span> · Block {activeBlock.index + 1} of {activeBlock.total}</> : 'Select a block to move, duplicate, edit, or delete it.'}
        </p>
        {activeBlock ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Selected block actions">
            {activeBlock.productId && onEditAffiliateProduct ? <BlockButton label="Edit product" onClick={() => onEditAffiliateProduct(activeBlock.productId!)}>Edit</BlockButton> : null}
            <BlockButton disabled={activeBlock.index === 0} label="Move block up" onClick={() => mutateActiveBlock('move-up')}>↑ Up</BlockButton>
            <BlockButton disabled={activeBlock.index === activeBlock.total - 1} label="Move block down" onClick={() => mutateActiveBlock('move-down')}>↓ Down</BlockButton>
            <BlockButton label="Duplicate block" onClick={() => mutateActiveBlock('duplicate')}>Duplicate</BlockButton>
            <BlockButton danger label="Delete block" onClick={() => mutateActiveBlock('delete')}>Delete</BlockButton>
          </div>
        ) : null}
      </div>

      <EditorSurface
        disabled={disabled}
        onBlockClick={handleSurfaceBlockClick}
        onInput={handleSurfaceInput}
        onPaste={handleSurfacePaste}
        onSelection={handleSurfaceSelection}
        onToolbarUpdate={handleSurfaceToolbarUpdate}
        ref={editorRef}
      />
    </div>
  );
});

function ToolButton({ active = false, disabled = false, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} aria-pressed={active} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${active ? 'border-violet-300/50 bg-violet-500/25 text-white' : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white'}`} disabled={disabled} onClick={onClick} onPointerDown={(event) => event.preventDefault()} title={label} type="button">{children}</button>;
}

function BlockButton({ children, danger = false, disabled = false, label, onClick }: { children: React.ReactNode; danger?: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return <button aria-label={label} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${danger ? 'border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`} disabled={disabled} onClick={onClick} onPointerDown={(event) => event.preventDefault()} title={label} type="button">{children}</button>;
}

const EditorSurface = memo(forwardRef<HTMLDivElement, {
  disabled: boolean;
  onBlockClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onInput: () => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onSelection: () => void;
  onToolbarUpdate: () => void;
}>(function EditorSurface({ disabled, onBlockClick, onInput, onPaste, onSelection, onToolbarUpdate }, ref) {
  return (
    <div
      aria-label="Content body"
      aria-multiline="true"
      className="cms-admin-editor h-[min(70vh,720px)] min-h-[460px] overflow-y-auto overscroll-contain scroll-smooth px-5 py-4 text-base leading-7 text-slate-200 outline-none [scrollbar-color:rgba(139,92,246,0.5)_rgba(15,23,42,0.75)] [&_a]:font-bold [&_a]:text-violet-300 [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-400 [&_blockquote]:bg-violet-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_cms-affiliate]:my-3 [&_cms-affiliate]:grid [&_cms-affiliate]:cursor-default [&_cms-affiliate]:gap-1 [&_cms-affiliate]:rounded-xl [&_cms-affiliate]:border [&_cms-affiliate]:border-emerald-400/30 [&_cms-affiliate]:bg-emerald-500/10 [&_cms-affiliate]:p-4 [&_cms-affiliate_span]:text-emerald-100 [&_cms-affiliate_small]:text-emerald-300/70 [&_cms-block]:my-3 [&_cms-block]:grid [&_cms-block]:cursor-default [&_cms-block]:gap-1 [&_cms-block]:rounded-xl [&_cms-block]:border [&_cms-block]:border-cyan-400/25 [&_cms-block]:bg-cyan-500/10 [&_cms-block]:p-4 [&_figure]:my-4 [&_figure]:rounded-2xl [&_figure]:border [&_figure]:border-white/10 [&_figure]:bg-black/20 [&_figure]:p-3 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-slate-400 [&_h1]:my-3 [&_h1]:text-3xl [&_h1]:font-black [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-black [&_h3]:my-2 [&_h3]:text-xl [&_h3]:font-black [&_h4]:my-2 [&_h4]:text-lg [&_h4]:font-black [&_hr]:my-5 [&_hr]:border-white/10 [&_img]:mx-auto [&_img]:max-h-[520px] [&_img]:max-w-full [&_img]:rounded-xl [&_img]:object-contain [&_li]:ml-6 [&_ol]:list-decimal [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/50 [&_pre]:p-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:p-2 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:p-2 [&_ul]:list-disc"
      contentEditable={!disabled}
      onBlur={onSelection}
      onClick={onBlockClick}
      onDoubleClick={onSelection}
      onInput={onInput}
      onKeyUp={onToolbarUpdate}
      onMouseUp={onToolbarUpdate}
      onPaste={onPaste}
      onPointerUp={onSelection}
      ref={ref}
      role="textbox"
      suppressContentEditableWarning
    />
  );
}));

export function cleanEditorHtml(source: string) {
  if (typeof DOMParser === 'undefined') return source;
  const documentValue = new DOMParser().parseFromString(source, 'text/html');
  documentValue.querySelectorAll('script,style,meta,link,iframe,object,embed').forEach((node) => node.remove());
  cleanNode(documentValue.body);
  return documentValue.body.innerHTML.trim() || '<p><br></p>';
}

const allowedElements = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'SMALL', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'FIGURE', 'FIGCAPTION', 'IMG', 'DIV', 'SPAN', 'CMS-AFFILIATE', 'CMS-BLOCK']);

function cleanNode(root: Element) {
  for (const child of Array.from(root.children)) {
    cleanNode(child);
    const element = child as HTMLElement;
    const style = element.getAttribute('style') ?? '';
    preserveSupportedStyle(element, style);
    wrapStyledContent(element, style);
    if (!allowedElements.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!allowedAttribute(element.tagName, attribute.name, attribute.value)) element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A') {
      const sourceHref = element.getAttribute('href') ?? '';
      const href = element.getAttribute('data-link-kind') === 'affiliate' && isSupportedLink(sourceHref)
        ? sourceHref
        : normalizeLink(sourceHref);
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

function preserveSupportedStyle(element: HTMLElement, style: string) {
  const alignment = /text-align\s*:\s*(left|center|right)/i.exec(style)?.[1]?.toLowerCase();
  if (alignment) element.setAttribute('data-align', alignment);
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
  if (lower === 'data-align') return ['left', 'center', 'right', 'full'].includes(value) && ['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE', 'DIV', 'UL', 'OL', 'LI', 'TABLE', 'FIGURE'].includes(tag);
  if (lower === 'data-text-size') return ['small', 'large', 'x-large'].includes(value) && ['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE', 'DIV', 'UL', 'OL', 'LI'].includes(tag);
  if (tag === 'A') {
    if (lower === 'href' || lower === 'title') return true;
    if (lower === 'target') return value === '_blank';
    if (lower === 'rel') return value.toLowerCase().split(/\s+/).filter(Boolean).every((token) => ['sponsored', 'nofollow', 'noopener', 'noreferrer'].includes(token));
    if (lower === 'data-link-kind') return value === 'affiliate';
    if (lower === 'data-affiliate-product-id') return /^[\w-]{1,191}$/.test(value);
    return false;
  }
  if (tag === 'IMG') return ['src', 'alt', 'title', 'width', 'height', 'loading'].includes(lower) && (lower !== 'src' || safeMediaUrl(value));
  if (tag === 'FIGURE') return ['data-cms-image', 'data-align', 'data-size', 'contenteditable'].includes(lower);
  if (tag === 'TH' || tag === 'TD') return ['colspan', 'rowspan', 'scope'].includes(lower);
  if (tag === 'CMS-AFFILIATE') return ['product-id', 'contenteditable'].includes(lower);
  if (tag === 'CMS-BLOCK') return ['kind', 'argument', 'contenteditable'].includes(lower);
  return false;
}

function directEditorChild(node: Node | null, editor: HTMLElement) {
  let element = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (element && element.parentElement !== editor) element = element.parentElement;
  return element?.parentElement === editor ? element : null;
}

function editorBlocksForRange(editor: HTMLElement, range: Range) {
  return (Array.from(editor.children) as HTMLElement[]).filter((child) => {
    try { return range.intersectsNode(child); } catch { return false; }
  });
}

function editorBlockLabel(block: HTMLElement) {
  if (block.tagName === 'CMS-AFFILIATE') return 'Affiliate product';
  if (block.tagName === 'CMS-BLOCK') return block.getAttribute('kind')?.replace(/-/g, ' ') || 'Content block';
  if (block.tagName === 'FIGURE') return 'Image';
  if (block.tagName === 'BLOCKQUOTE') return 'Quote';
  if (block.tagName === 'HR') return 'Divider';
  if (block.tagName === 'TABLE') return 'Table';
  if (block.tagName === 'UL' || block.tagName === 'OL') return 'List';
  if (/^H[1-4]$/.test(block.tagName)) return `Heading ${block.tagName.slice(1)}`;
  if (block.tagName === 'PRE') return 'Code';
  return 'Paragraph';
}

function sameActiveBlock(current: ActiveBlockState | null, next: ActiveBlockState) {
  return Boolean(current && current.index === next.index && current.label === next.label && current.productId === next.productId && current.total === next.total);
}

function sameToolbarState(current: ToolbarState, next: ToolbarState) {
  return current.bold === next.bold
    && current.italic === next.italic
    && current.underline === next.underline
    && current.strikeThrough === next.strikeThrough
    && current.insertUnorderedList === next.insertUnorderedList
    && current.insertOrderedList === next.insertOrderedList
    && current.format === next.format
    && current.alignment === next.alignment
    && current.textSize === next.textSize;
}

function alignmentForBlock(block: HTMLElement | null): TextAlignment {
  const value = block?.getAttribute('data-align');
  return value === 'center' || value === 'right' ? value : 'left';
}

function textSizeForBlock(block: HTMLElement | null): TextSize {
  const value = block?.getAttribute('data-text-size');
  return value === 'small' || value === 'large' || value === 'x-large' ? value : 'normal';
}

function placeCaretForBlock(block: HTMLElement, editor: HTMLElement) {
  editor.focus({ preventScroll: true });
  const range = document.createRange();
  if (block.getAttribute('contenteditable') === 'false' || block.tagName === 'HR') {
    range.setStartAfter(block);
  } else {
    range.selectNodeContents(block);
    range.collapse(false);
  }
  range.collapse(true);
  restoreRange(range);
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  if (/^(?:https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

function isSupportedLink(value: string) {
  return Boolean(normalizeLink(value));
}

function isExternalLink(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function closestLink(node: Node | null, editor: HTMLElement) {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  const link = element?.closest('a');
  return link instanceof HTMLAnchorElement && editor.contains(link) ? link : null;
}

function setAnchorAttributes(anchor: HTMLAnchorElement, href: string, attributes: Record<string, string>) {
  anchor.setAttribute('href', href);
  for (const name of ['target', 'rel', 'data-link-kind', 'data-affiliate-product-id']) anchor.removeAttribute(name);
  for (const [name, value] of Object.entries(attributes)) anchor.setAttribute(name, value);
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  element.remove();
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

function inlineTagForCommand(command: string) {
  if (command === 'bold') return 'strong';
  if (command === 'italic') return 'em';
  if (command === 'underline') return 'u';
  if (command === 'strikeThrough') return 's';
  return null;
}

function wrapSelection(range: Range, tagName: string, editor: HTMLElement, attributes: Record<string, string> = {}) {
  const startBlock = directEditorChild(range.startContainer, editor);
  const endBlock = directEditorChild(range.endContainer, editor);
  if (!startBlock || startBlock !== endBlock) return false;
  const wrapper = document.createElement(tagName);
  for (const [name, value] of Object.entries(attributes)) wrapper.setAttribute(name, value);
  try {
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    range.selectNodeContents(wrapper);
    restoreRange(range);
    return true;
  } catch {
    return false;
  }
}

function linkTabClass(active: boolean) {
  return `rounded-xl px-3 py-2.5 text-sm font-black transition ${active ? 'bg-violet-500 text-white shadow-lg shadow-violet-950/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;
}

const dialogInputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const dialogLabelClass = 'grid gap-1 text-xs font-black uppercase tracking-wide text-slate-400';
const dialogCheckboxClass = 'flex items-center gap-2 text-sm font-bold text-slate-300';
const dialogPrimaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40';
const dialogSelectedButton = 'rounded-xl border border-violet-300/40 bg-violet-500/25 px-4 py-2.5 text-sm font-black text-violet-100';
const dialogSecondaryButton = 'rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-40';
const dialogDangerButton = 'mr-auto rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200 transition hover:bg-red-500/20';

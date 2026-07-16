// @vitest-environment jsdom
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { getSearchQuery, openSearchPanel, search } from '@codemirror/search';
import { afterEach, describe, expect, it } from 'vitest';
import { createSearchPanel, showReplaceControls, updateSearchPanelLocale } from './SearchPanel';

const views: EditorView[] = [];

function createView() {
  const view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc: 'alpha beta alpha',
      extensions: [search({ top: true, createPanel: createSearchPanel('en') })],
    }),
  });
  views.push(view);
  openSearchPanel(view);
  return view;
}

afterEach(() => {
  views.splice(0).forEach((view) => view.destroy());
  document.body.innerHTML = '';
});

describe('Markdown search panel', () => {
  it('keeps focus and the complete query while typing', () => {
    const view = createView();
    const input = document.querySelector<HTMLInputElement>('input[name="search"]')!;
    input.focus();

    input.focus();
    for (const character of 'alpha') {
      input.value += character;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    expect(getSearchQuery(view.state).search).toBe('alpha');
    expect(document.activeElement).toBe(input);
    expect(view.state.selection.main).toMatchObject({ from: 0, to: 5 });
  });

  it('focuses the find field when replace controls are shown', () => {
    const view = createView();
    const input = document.querySelector<HTMLInputElement>('input[name="search"]')!;

    showReplaceControls(view, true);

    expect(document.activeElement).toBe(input);
    expect(document.querySelector<HTMLDivElement>('.cm-search-replace-row')!.hidden).toBe(false);
  });

  it('focuses the find field when the panel mounts', () => {
    createView();

    expect(document.querySelector('.cm-search-panel')).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector('input[name="search"]'));
  });

  it('replaces every match and updates the result count', () => {
    const view = createView();
    const findInput = document.querySelector<HTMLInputElement>('input[name="search"]')!;
    const replaceInput = document.querySelector<HTMLInputElement>('input[name="replace"]')!;
    showReplaceControls(view, true);
    findInput.value = 'alpha';
    findInput.dispatchEvent(new Event('input', { bubbles: true }));
    replaceInput.value = 'omega';
    replaceInput.dispatchEvent(new Event('input', { bubbles: true }));

    document.querySelector<HTMLButtonElement>('button[aria-label="Replace All"]')!.click();

    expect(view.state.doc.toString()).toBe('omega beta omega');
    expect(document.querySelector('.cm-search-status')!.textContent).toBe('No results');
  });

  it('updates an open panel language without losing its query or mode', () => {
    const view = createView();
    const findInput = document.querySelector<HTMLInputElement>('input[name="search"]')!;
    showReplaceControls(view, true);
    findInput.value = 'alpha';
    findInput.dispatchEvent(new Event('input', { bubbles: true }));

    updateSearchPanelLocale(view, 'zh');

    expect(findInput.placeholder).toBe('查找');
    expect(findInput.value).toBe('alpha');
    expect(document.querySelector<HTMLDivElement>('.cm-search-replace-row')!.hidden).toBe(false);
    expect(document.querySelector('button[aria-label="全部替换"]')).not.toBeNull();
  });
});

import type { EditorState } from '@codemirror/state';
import type { SearchQuery } from '@codemirror/search';

export interface SearchStatus {
  current: number;
  total: number;
  valid: boolean;
}

export function canRunPendingSearch(
  viewMode: 'split' | 'editor' | 'preview',
  editorReady: boolean,
  action: string | null,
) {
  return viewMode !== 'preview' && editorReady && action !== null;
}

export function getSearchStatus(state: EditorState, query: SearchQuery): SearchStatus {
  if (!query.search) return { current: 0, total: 0, valid: true };
  if (!query.valid) return { current: 0, total: 0, valid: false };

  const selection = state.selection.main;
  const matches: Array<{ from: number; to: number }> = [];
  const cursor = query.getCursor(state);
  for (let result = cursor.next(); !result.done; result = cursor.next()) {
    matches.push(result.value);
  }
  const currentIndex = matches.findIndex(
    ({ from, to }) => from === selection.from && to === selection.to,
  );
  const nextIndex = matches.findIndex(({ from }) => from >= selection.head);

  return {
    current: currentIndex >= 0 ? currentIndex + 1 : (nextIndex >= 0 ? nextIndex + 1 : 1),
    total: matches.length,
    valid: true,
  };
}

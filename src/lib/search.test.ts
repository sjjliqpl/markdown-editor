import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { SearchQuery } from '@codemirror/search';
import { canRunPendingSearch, getSearchStatus } from './search';
import { getSearchPanelLabels } from '../components/SearchPanel';

function state(doc: string, anchor = 0, head = anchor) {
  return EditorState.create({
    doc,
    selection: { anchor, head },
  });
}

describe('getSearchStatus', () => {
  it('counts literal matches and identifies the selected match', () => {
    const query = new SearchQuery({ search: 'alpha' });

    expect(getSearchStatus(state('alpha beta alpha', 11, 16), query)).toEqual({
      current: 2,
      total: 2,
      valid: true,
    });
  });

  it('reports the next match when the selection is not on a result', () => {
    const query = new SearchQuery({ search: 'alpha' });

    expect(getSearchStatus(state('alpha beta alpha', 7), query)).toMatchObject({
      current: 2,
      total: 2,
    });
    expect(getSearchStatus(state('alpha beta alpha', 16), query)).toMatchObject({
      current: 1,
      total: 2,
    });
  });

  it('respects case-sensitive and whole-word options', () => {
    const document = state('Cat cat category cat');

    expect(getSearchStatus(document, new SearchQuery({ search: 'cat', caseSensitive: true }))).toMatchObject({ total: 3 });
    expect(getSearchStatus(document, new SearchQuery({ search: 'cat', wholeWord: true }))).toMatchObject({ total: 3 });
    expect(getSearchStatus(document, new SearchQuery({ search: 'cat', caseSensitive: true, wholeWord: true }))).toMatchObject({ total: 2 });
  });

  it('supports regular expressions and reports invalid expressions', () => {
    expect(getSearchStatus(state('item-1 item-22 item-x'), new SearchQuery({ search: 'item-\\d+', regexp: true }))).toMatchObject({
      total: 2,
      valid: true,
    });
    expect(getSearchStatus(state('anything'), new SearchQuery({ search: '[', regexp: true }))).toEqual({
      current: 0,
      total: 0,
      valid: false,
    });
  });

  it('returns an empty status for a blank query', () => {
    expect(getSearchStatus(state('alpha'), new SearchQuery({ search: '' }))).toEqual({
      current: 0,
      total: 0,
      valid: true,
    });
  });
});

describe('canRunPendingSearch', () => {
  it('waits until the source editor is mounted and ready', () => {
    expect(canRunPendingSearch('preview', true, 'find')).toBe(false);
    expect(canRunPendingSearch('editor', false, 'find')).toBe(false);
    expect(canRunPendingSearch('editor', true, 'find')).toBe(true);
    expect(canRunPendingSearch('split', true, null)).toBe(false);
  });
});

describe('getSearchPanelLabels', () => {
  it('returns the active locale labels for an already-open panel', () => {
    expect(getSearchPanelLabels('en').find).toBe('Find');
    expect(getSearchPanelLabels('zh').find).toBe('查找');
    expect(getSearchPanelLabels('zh').replaceAll).toBe('全部替换');
  });
});

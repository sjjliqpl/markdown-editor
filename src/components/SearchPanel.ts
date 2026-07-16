import { SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, replaceAll, replaceNext, setSearchQuery } from '@codemirror/search';
import type { EditorView, Panel, ViewUpdate } from '@codemirror/view';
import type { Locale } from '../i18n';
import { getSearchStatus } from '../lib/search';

const SEARCH_MODE_EVENT = 'markdown-search-mode';
const SEARCH_LOCALE_EVENT = 'markdown-search-locale';

const labels = {
  en: {
    find: 'Find', replace: 'Replace with', previous: 'Previous match', next: 'Next match',
    replaceOne: 'Replace', replaceAll: 'Replace All', matchCase: 'Match case',
    wholeWord: 'Whole word', regexp: 'Regular expression', close: 'Close',
    noResults: 'No results', invalidRegexp: 'Invalid regular expression',
  },
  zh: {
    find: '查找', replace: '替换为', previous: '上一个匹配项', next: '下一个匹配项',
    replaceOne: '替换', replaceAll: '全部替换', matchCase: '区分大小写',
    wholeWord: '全词匹配', regexp: '正则表达式', close: '关闭',
    noResults: '无结果', invalidRegexp: '正则表达式无效',
  },
} as const;

export function getSearchPanelLabels(locale: Locale) {
  return labels[locale];
}

function button(label: string, action: () => void, className = '') {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `cm-search-button ${className}`.trim();
  element.title = label;
  element.setAttribute('aria-label', label);
  element.addEventListener('mousedown', (event) => event.preventDefault());
  element.addEventListener('click', action);
  return element;
}

function iconButton(label: string, text: string, action: () => void) {
  const element = button(label, action, 'cm-search-icon-button');
  element.textContent = text;
  return element;
}

export function showReplaceControls(view: EditorView, visible: boolean) {
  view.dom.dispatchEvent(new CustomEvent<boolean>(SEARCH_MODE_EVENT, { detail: visible }));
}

export function updateSearchPanelLocale(view: EditorView, locale: Locale) {
  view.dom.dispatchEvent(new CustomEvent<Locale>(SEARCH_LOCALE_EVENT, { detail: locale }));
}

export function createSearchPanel(locale: Locale) {
  return (view: EditorView): Panel => new MarkdownSearchPanel(view, locale);
}

class MarkdownSearchPanel implements Panel {
  readonly dom: HTMLElement;
  readonly top = true;

  private readonly view: EditorView;
  private readonly findInput: HTMLInputElement;
  private readonly replaceInput: HTMLInputElement;
  private readonly replaceRow: HTMLDivElement;
  private readonly status: HTMLSpanElement;
  private readonly caseButton: HTMLButtonElement;
  private readonly wordButton: HTMLButtonElement;
  private readonly regexpButton: HTMLButtonElement;
  private readonly previousButton: HTMLButtonElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly replaceOneButton: HTMLButtonElement;
  private readonly replaceAllButton: HTMLButtonElement;
  private query: SearchQuery;
  private readonly onModeChange: EventListener;
  private readonly onLocaleChange: EventListener;
  private locale: Locale;

  constructor(view: EditorView, locale: Locale) {
    this.view = view;
    this.locale = locale;
    this.query = getSearchQuery(view.state);
    const text = labels[locale];

    this.dom = document.createElement('div');
    this.dom.className = 'cm-search-panel';

    const findRow = document.createElement('div');
    findRow.className = 'cm-search-row';

    this.findInput = document.createElement('input');
    this.findInput.className = 'cm-search-input';
    this.findInput.name = 'search';
    this.findInput.placeholder = text.find;
    this.findInput.setAttribute('aria-label', text.find);
    this.findInput.setAttribute('main-field', 'true');
    this.findInput.value = this.query.search;
    this.findInput.addEventListener('input', () => {
      this.commit();
      if (this.query.valid && this.query.search) findNext(this.view);
      this.findInput.focus();
      const cursor = this.findInput.value.length;
      this.findInput.setSelectionRange(cursor, cursor);
    });

    this.status = document.createElement('span');
    this.status.className = 'cm-search-status';
    this.status.setAttribute('aria-live', 'polite');

    this.previousButton = iconButton(text.previous, '↑', () => findPrevious(this.view));
    this.nextButton = iconButton(text.next, '↓', () => findNext(this.view));
    findRow.append(
      this.findInput,
      this.status,
      this.previousButton,
      this.nextButton,
    );

    this.caseButton = this.optionButton('Aa', text.matchCase, 'caseSensitive');
    this.wordButton = this.optionButton('W', text.wholeWord, 'wholeWord');
    this.regexpButton = this.optionButton('.*', text.regexp, 'regexp');
    findRow.append(this.caseButton, this.wordButton, this.regexpButton);

    this.closeButton = iconButton(text.close, '×', () => closeSearchPanel(this.view));
    this.closeButton.classList.add('cm-search-close');
    findRow.append(this.closeButton);

    this.replaceRow = document.createElement('div');
    this.replaceRow.className = 'cm-search-row cm-search-replace-row';
    this.replaceRow.hidden = true;

    this.replaceInput = document.createElement('input');
    this.replaceInput.className = 'cm-search-input';
    this.replaceInput.name = 'replace';
    this.replaceInput.placeholder = text.replace;
    this.replaceInput.setAttribute('aria-label', text.replace);
    this.replaceInput.value = this.query.replace;
    this.replaceInput.addEventListener('input', () => this.commit());

    this.replaceOneButton = button(text.replaceOne, () => replaceNext(this.view));
    this.replaceOneButton.textContent = text.replaceOne;
    this.replaceAllButton = button(text.replaceAll, () => replaceAll(this.view));
    this.replaceAllButton.textContent = text.replaceAll;
    this.replaceRow.append(this.replaceInput, this.replaceOneButton, this.replaceAllButton);

    this.dom.append(findRow, this.replaceRow);
    this.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearchPanel(this.view);
      } else if (event.key === 'Enter' && event.target === this.findInput) {
        event.preventDefault();
        (event.shiftKey ? findPrevious : findNext)(this.view);
      }
    });

    this.onModeChange = ((event: CustomEvent<boolean>) => {
      this.setReplaceVisible(event.detail);
    }) as EventListener;
    view.dom.addEventListener(SEARCH_MODE_EVENT, this.onModeChange);
    this.onLocaleChange = ((event: CustomEvent<Locale>) => {
      this.locale = event.detail;
      this.applyLocale();
    }) as EventListener;
    view.dom.addEventListener(SEARCH_LOCALE_EVENT, this.onLocaleChange);
    this.updateControls(text.noResults, text.invalidRegexp);
  }

  update(update: ViewUpdate) {
    const nextQuery = getSearchQuery(update.state);
    if (!nextQuery.eq(this.query)) {
      this.query = nextQuery;
      this.findInput.value = nextQuery.search;
      this.replaceInput.value = nextQuery.replace;
    }
    const text = labels[this.locale];
    this.updateControls(text.noResults, text.invalidRegexp);
  }

  mount() {
    this.findInput.focus();
    this.findInput.select();
  }

  destroy() {
    this.view.dom.removeEventListener(SEARCH_MODE_EVENT, this.onModeChange);
    this.view.dom.removeEventListener(SEARCH_LOCALE_EVENT, this.onLocaleChange);
  }

  private optionButton(
    content: string,
    label: string,
    key: 'caseSensitive' | 'wholeWord' | 'regexp',
  ) {
    const element = button(label, () => {
      const nextValue = !this.query[key];
      this.query = new SearchQuery({
        search: this.query.search,
        replace: this.query.replace,
        caseSensitive: key === 'caseSensitive' ? nextValue : this.query.caseSensitive,
        wholeWord: key === 'wholeWord' ? nextValue : this.query.wholeWord,
        regexp: key === 'regexp' ? nextValue : this.query.regexp,
      });
      this.view.dispatch({ effects: setSearchQuery.of(this.query) });
    }, 'cm-search-option');
    element.textContent = content;
    return element;
  }

  private commit() {
    this.query = new SearchQuery({
      search: this.findInput.value,
      replace: this.replaceInput.value,
      caseSensitive: this.query.caseSensitive,
      wholeWord: this.query.wholeWord,
      regexp: this.query.regexp,
    });
    this.view.dispatch({ effects: setSearchQuery.of(this.query) });
  }

  private setReplaceVisible(visible: boolean) {
    this.replaceRow.hidden = !visible;
    this.findInput.focus();
  }

  private applyLocale() {
    const text = labels[this.locale];
    this.findInput.placeholder = text.find;
    this.findInput.setAttribute('aria-label', text.find);
    this.replaceInput.placeholder = text.replace;
    this.replaceInput.setAttribute('aria-label', text.replace);
    this.setButtonLabel(this.previousButton, text.previous);
    this.setButtonLabel(this.nextButton, text.next);
    this.setButtonLabel(this.caseButton, text.matchCase);
    this.setButtonLabel(this.wordButton, text.wholeWord);
    this.setButtonLabel(this.regexpButton, text.regexp);
    this.setButtonLabel(this.closeButton, text.close);
    this.setButtonLabel(this.replaceOneButton, text.replaceOne);
    this.replaceOneButton.textContent = text.replaceOne;
    this.setButtonLabel(this.replaceAllButton, text.replaceAll);
    this.replaceAllButton.textContent = text.replaceAll;
    this.updateControls(text.noResults, text.invalidRegexp);
  }

  private setButtonLabel(element: HTMLButtonElement, label: string) {
    element.title = label;
    element.setAttribute('aria-label', label);
  }

  private updateControls(noResults: string, invalidRegexp: string) {
    const searchStatus = getSearchStatus(this.view.state, this.query);
    this.status.classList.toggle('is-error', !searchStatus.valid);
    this.status.textContent = !searchStatus.valid
      ? invalidRegexp
      : searchStatus.total === 0 && this.query.search
        ? noResults
        : `${searchStatus.current}/${searchStatus.total}`;
    this.caseButton.setAttribute('aria-pressed', String(this.query.caseSensitive));
    this.wordButton.setAttribute('aria-pressed', String(this.query.wholeWord));
    this.regexpButton.setAttribute('aria-pressed', String(this.query.regexp));
  }
}

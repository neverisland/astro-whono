import { getTagKeys, getTagPath, toTagKey, type TagScope } from '../lib/tags';
import { createWithBase } from '../utils/format';

type IndexItem = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  text: string;
  date: string | null;
};

type PageItem = {
  el: HTMLElement;
  slug: string;
};

const root = document.querySelector<HTMLElement>('[data-entry-filters]');
const FILTER_DEBOUNCE_MS = 120;

if (!root) {
  // Current page does not use entry search / tags.
} else {
  const searchRoot = root.querySelector<HTMLElement>('[data-entry-search]');
  const input = searchRoot?.querySelector<HTMLInputElement>('[data-entry-search-input]') ?? null;
  const toggleBtn = searchRoot?.querySelector<HTMLButtonElement>('[data-entry-search-toggle]') ?? null;
  const panel = searchRoot?.querySelector<HTMLElement>('[data-entry-search-panel]') ?? null;
  const statusEl = root.querySelector<HTMLDivElement>('[data-entry-search-status]');
  const tagTrigger = root.querySelector<HTMLAnchorElement>('[data-entry-tag-trigger]');
  const tagDialog = root.querySelector<HTMLDialogElement>('[data-entry-tag-dialog]');
  const tagCloseBtn = root.querySelector<HTMLButtonElement>('[data-entry-tag-close]');
  const tagDialogTitle = tagDialog?.querySelector<HTMLElement>('.entry-tags-dialog__title') ?? null;
  const indexUrlRaw = (root.dataset.indexUrl ?? '').trim();
  const sectionSelector = (root.dataset.sectionSelector ?? '').trim();
  const tagScopeRaw = (root.dataset.tagScope ?? '').trim();
  const activeTagKey = (root.dataset.activeTagKey ?? '').trim();
  const activeTagLabel = (root.dataset.activeTagLabel ?? '').trim();

  const base = import.meta.env.BASE_URL ?? '/';
  const withBase = createWithBase(base);
  const indexUrl = indexUrlRaw ? withBase(indexUrlRaw) : '';

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-entry-item]')).map((el) => ({
    el,
    slug: (el.getAttribute('data-slug') || '').trim()
  })) as PageItem[];

  const sections = sectionSelector
    ? Array.from(document.querySelectorAll<HTMLElement>(sectionSelector))
    : [];
  const tagScope: TagScope | null = tagScopeRaw === 'archive' || tagScopeRaw === 'essay' ? tagScopeRaw : null;
  const availableTagKeys = new Set(
    Array.from(root.querySelectorAll<HTMLElement>('[data-entry-tag-key]'))
      .map((el) => (el.dataset.entryTagKey ?? '').trim())
      .filter(Boolean)
  );

  const setStatus = (text: string) => {
    if (!statusEl) return;
    if (statusEl.textContent === text) return;
    statusEl.textContent = text;
  };

  const setItemVisible = (item: PageItem, visible: boolean) => {
    if (item.el.hidden === !visible) return;
    item.el.hidden = !visible;
  };

  const syncLegacyTagParam = () => {
    if (!tagScope) return;

    const url = new URL(window.location.href);
    const rawTag = (url.searchParams.get('tag') ?? '').trim();
    if (!rawTag) return;

    const tagKey = toTagKey(rawTag);
    url.searchParams.delete('tag');
    const search = url.searchParams.toString();
    const hash = url.hash || '';
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (!tagKey || (availableTagKeys.size > 0 && !availableTagKeys.has(tagKey))) {
      const fallback = `${url.pathname}${search ? `?${search}` : ''}${hash}`;
      if (fallback !== current) {
        window.history.replaceState({}, '', fallback);
      }
      return;
    }

    const targetPath = withBase(getTagPath(tagScope, tagKey));
    const target = `${targetPath}${search ? `?${search}` : ''}${hash}`;
    if (target !== current) {
      window.location.replace(target);
    }
  };

  const showAllItems = () => {
    for (const item of items) {
      setItemVisible(item, true);
    }
  };

  const syncSections = (hasActiveFilter: boolean) => {
    if (!sections.length) return;
    for (const section of sections) {
      const sectionItems = Array.from(section.querySelectorAll<HTMLElement>('[data-entry-item]'));
      const hasVisible = sectionItems.some((el) => !el.hidden);
      section.hidden = hasActiveFilter && !hasVisible;
    }
  };

  const buildHay = (item: IndexItem) => {
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
    return `${item.title ?? ''} ${item.description ?? ''} ${tags} ${item.text ?? ''}`.toLowerCase();
  };

  let indexPromise: Promise<IndexItem[] | null> | null = null;
  let indexCache: IndexItem[] | null = null;
  let indexHay: Map<string, string> | null = null;
  let indexTagKeys: Map<string, string[]> | null = null;
  let indexFailed = false;
  let filterTimer: number | null = null;
  let filterRunId = 0;

  const isSearchOpen = () => searchRoot?.classList.contains('is-open') ?? false;

  const setSearchOpen = (open: boolean) => {
    if (!searchRoot) return;
    searchRoot.classList.toggle('is-open', open);
    toggleBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel?.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (input) input.tabIndex = open ? 0 : -1;
  };

  const getStatusPrefix = (query: string, totalMatches: number) => {
    if (query && activeTagLabel) {
      return `标签 #${activeTagLabel} 下共命中 ${totalMatches} 条`;
    }
    if (query) {
      return totalMatches === 0 ? '未找到匹配内容' : `共命中 ${totalMatches} 条`;
    }
    return '';
  };

  const updateStatusForMatches = (query: string, totalMatches: number, visibleMatches: number) => {
    const prefix = getStatusPrefix(query, totalMatches);
    if (!prefix) {
      setStatus('');
      return;
    }

    if (totalMatches === 0) {
      setStatus('未找到匹配内容');
      return;
    }
    if (visibleMatches === totalMatches) {
      setStatus(query && !activeTagKey ? `命中 ${totalMatches} 条` : prefix);
      return;
    }
    if (visibleMatches === 0) {
      setStatus(`${prefix}（当前页无结果，可翻页继续查看）`);
      return;
    }
    setStatus(`${prefix}（当前页 ${visibleMatches} 条，可翻页查看更多）`);
  };

  const scheduleApplyFilter = (delay = FILTER_DEBOUNCE_MS) => {
    if (filterTimer !== null) {
      window.clearTimeout(filterTimer);
    }
    filterTimer = window.setTimeout(() => {
      filterTimer = null;
      void applyFilter();
    }, delay);
  };

  const setDegradedMode = () => {
    if (input) {
      input.placeholder = '索引加载失败';
      input.disabled = true;
      input.setAttribute('aria-disabled', 'true');
    }
    if (toggleBtn) {
      toggleBtn.disabled = true;
      toggleBtn.setAttribute('aria-disabled', 'true');
    }
    showAllItems();
    syncSections(false);
    setStatus('索引加载失败，已禁用搜索');
  };

  const loadIndex = async () => {
    if (!indexUrl) return null;
    if (indexCache) return indexCache;
    if (indexFailed) return null;

    if (!indexPromise) {
      setStatus('正在加载索引...');
      indexPromise = fetch(indexUrl)
        .then((response) => {
          if (!response.ok) throw new Error('index fetch failed');
          return response.json();
        })
        .then((data) => {
          if (!Array.isArray(data)) throw new Error('index data invalid');
          indexCache = data as IndexItem[];
          indexHay = new Map(indexCache.map((item) => [item.slug, buildHay(item)]));
          indexTagKeys = new Map(indexCache.map((item) => [item.slug, getTagKeys(item.tags)]));
          setStatus('');
          return indexCache;
        })
        .catch(() => {
          indexFailed = true;
          setDegradedMode();
          return null;
        });
    }

    return indexPromise;
  };

  const applyFilter = async () => {
    if (filterTimer !== null) {
      window.clearTimeout(filterTimer);
      filterTimer = null;
    }

    const runId = ++filterRunId;
    const query = (input?.value || '').trim().toLowerCase();

    if (!query) {
      showAllItems();
      syncSections(false);
      setStatus('');
      return;
    }

    const index = await loadIndex();
    if (runId !== filterRunId) return;
    if (!index || !indexHay || !indexTagKeys) return;

    const matchedSlugs = new Set<string>();
    for (const item of index) {
      const hay = indexHay.get(item.slug) || '';
      if (!hay.includes(query)) continue;

      if (activeTagKey) {
        const normalizedTagKeys = indexTagKeys.get(item.slug) ?? [];
        if (!normalizedTagKeys.includes(activeTagKey)) continue;
      }

      matchedSlugs.add(item.slug);
    }

    let visibleMatches = 0;
    for (const item of items) {
      const matched = item.slug ? matchedSlugs.has(item.slug) : false;
      setItemVisible(item, matched);
      if (matched) visibleMatches += 1;
    }

    syncSections(true);
    updateStatusForMatches(query, matchedSlugs.size, visibleMatches);
  };

  const removePickerParam = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('picker') !== 'tag') return;
    url.searchParams.delete('picker');
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === next) return;
    window.history.replaceState({}, '', next);
  };

  const openTagDialog = (options: { focusTitle?: boolean } = {}) => {
    if (!tagDialog || tagDialog.open) return;
    if (typeof tagDialog.showModal === 'function') {
      tagDialog.showModal();
      if (options.focusTitle && tagDialogTitle) {
        window.requestAnimationFrame(() => {
          tagDialogTitle.focus({ preventScroll: true });
        });
      }
      tagTrigger?.setAttribute('aria-expanded', 'true');
      return;
    }
    tagDialog.setAttribute('open', '');
    if (options.focusTitle && tagDialogTitle) {
      window.requestAnimationFrame(() => {
        tagDialogTitle.focus({ preventScroll: true });
      });
    }
    tagTrigger?.setAttribute('aria-expanded', 'true');
  };

  const closeTagDialog = () => {
    if (!tagDialog) return;
    if (typeof tagDialog.close === 'function') {
      tagDialog.close();
      tagTrigger?.setAttribute('aria-expanded', 'false');
      return;
    }
    tagDialog.removeAttribute('open');
    tagTrigger?.setAttribute('aria-expanded', 'false');
  };

  const resetSearch = () => {
    if (input) input.value = '';
    showAllItems();
    syncSections(false);
    setStatus('');
  };

  syncLegacyTagParam();
  setSearchOpen(false);
  tagTrigger?.setAttribute('aria-expanded', 'false');

  toggleBtn?.addEventListener('click', () => {
    const next = !isSearchOpen();
    if (next) {
      setSearchOpen(true);
      window.setTimeout(() => input?.focus(), 0);
      void loadIndex();
      return;
    }
    resetSearch();
    setSearchOpen(false);
  });

  input?.addEventListener('focus', () => {
    setSearchOpen(true);
    void loadIndex();
  });

  input?.addEventListener('input', () => {
    scheduleApplyFilter();
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      resetSearch();
      setSearchOpen(false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void applyFilter();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node | null;
    if (!target) return;
    if (!isSearchOpen()) return;
    if (searchRoot?.contains(target)) return;
    if (input?.value.trim()) return;
    setSearchOpen(false);
  });

  tagTrigger?.addEventListener('click', (event) => {
    event.preventDefault();
    openTagDialog();
  });

  tagCloseBtn?.addEventListener('click', () => {
    closeTagDialog();
  });

  tagDialog?.addEventListener('cancel', () => {
    removePickerParam();
  });

  tagDialog?.addEventListener('close', () => {
    removePickerParam();
  });

  tagDialog?.addEventListener('click', (event) => {
    if (event.target === tagDialog) {
      closeTagDialog();
    }
  });

  if (new URLSearchParams(window.location.search).get('picker') === 'tag') {
    if (tagDialog) {
      openTagDialog({ focusTitle: true });
    }
    removePickerParam();
  }
}

import {
  getCollection,
  type CollectionEntry,
  type CollectionKey
} from 'astro:content';
export { createWithBase } from '../utils/format';

type OrderBy<K extends CollectionKey> = (a: CollectionEntry<K>, b: CollectionEntry<K>) => number;

export type GetPublishedOptions<K extends CollectionKey> = {
  orderBy?: OrderBy<K>;
  includeDraft?: boolean;
};

export const isReservedSlug = (slug: string) => slug.startsWith('page/');

export const getTotalPages = (itemCount: number, pageSize: number) =>
  Math.ceil(itemCount / pageSize);

export const getPageSlice = <T>(items: T[], currentPage: number, pageSize: number) => {
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const buildPaginatedPaths = (totalPages: number) => {
  if (totalPages <= 1) return [];
  return Array.from({ length: totalPages - 1 }, (_, i) => ({
    params: { page: String(i + 2) }
  }));
};

export async function getPublished<K extends CollectionKey>(
  name: K,
  opts: GetPublishedOptions<K> = {}
) {
  const prod = import.meta.env.PROD;
  const includeDraft = opts.includeDraft ?? !prod;
  const filter = includeDraft ? undefined : ({ data }: CollectionEntry<K>) => data.draft !== true;
  const items = await getCollection(name, filter);

  if (!opts.orderBy) return items;
  return items.slice().sort(opts.orderBy);
}

export type EssayEntry = CollectionEntry<'essay'>;

export const getEssaySlug = (entry: EssayEntry) => entry.data.slug ?? entry.id;

const orderByEssayDate = (a: EssayEntry, b: EssayEntry) => b.data.date.valueOf() - a.data.date.valueOf();
const shouldMemoizeEssayQueries = import.meta.env.PROD;

let sortedEssaysPromise: Promise<EssayEntry[]> | null = null;
let visibleEssaysPromise: Promise<EssayEntry[]> | null = null;
let archiveEssaysPromise: Promise<EssayEntry[]> | null = null;

const cloneEssayEntries = (entries: readonly EssayEntry[]) => entries.slice();

const loadSortedEssays = () =>
  getPublished('essay', {
    orderBy: orderByEssayDate
  });

export async function getSortedEssays() {
  if (!shouldMemoizeEssayQueries) {
    return loadSortedEssays();
  }

  sortedEssaysPromise ??= loadSortedEssays();
  return cloneEssayEntries(await sortedEssaysPromise);
}

export async function getVisibleEssays() {
  if (!shouldMemoizeEssayQueries) {
    const essays = await getSortedEssays();
    return essays.filter((entry) => !isReservedSlug(getEssaySlug(entry)));
  }

  visibleEssaysPromise ??= getSortedEssays().then((essays) =>
    essays.filter((entry) => !isReservedSlug(getEssaySlug(entry)))
  );
  return cloneEssayEntries(await visibleEssaysPromise);
}

export async function getArchiveEssays() {
  if (!shouldMemoizeEssayQueries) {
    const essays = await getSortedEssays();
    return essays.filter((entry) => entry.data.archive !== false && !isReservedSlug(getEssaySlug(entry)));
  }

  archiveEssaysPromise ??= getSortedEssays().then((essays) =>
    essays.filter((entry) => entry.data.archive !== false && !isReservedSlug(getEssaySlug(entry)))
  );
  return cloneEssayEntries(await archiveEssaysPromise);
}

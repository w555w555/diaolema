import type { NewPostRow, PostRow, PostStore } from './types';

export function createMemoryStore(seed: PostRow[] = []): PostStore {
  const rows = [...seed];
  let seq = rows.length + 1;
  return {
    async list() {
      return [...rows].sort((a, b) => b.crawl_time.localeCompare(a.crawl_time));
    },
    async findByUrl(url: string) {
      return rows.find((row) => row.url === url);
    },
    async insert(row: NewPostRow) {
      if (rows.some((item) => item.url === row.url)) {
        const err = new Error('UNIQUE url');
        throw err;
      }
      const post: PostRow = { ...row, id: `mem-${seq++}` };
      rows.unshift(post);
      return post;
    },
  };
}

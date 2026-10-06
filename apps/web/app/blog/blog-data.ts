import { fetchPublicApi } from "../public-api";

export interface PublicBlogPost {
  publicId: string;
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

interface BlogPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface BlogPage {
  posts: PublicBlogPost[];
  pagination: BlogPagination;
}

async function getBlogPage(page: number): Promise<BlogPage | null> {
  return fetchPublicApi<BlogPage>(`/customer/blogs?page=${page}`, 60);
}

export async function getBlogPosts(): Promise<PublicBlogPost[]> {
  const page = await getBlogPage(1);
  return page?.posts ?? [];
}

export async function getAllBlogPosts(): Promise<PublicBlogPost[]> {
  const firstPage = await getBlogPage(1);
  if (!firstPage) return [];

  const posts = [...firstPage.posts];
  const totalPages = Math.min(firstPage.pagination.totalPages, 4_167);

  for (let page = 2; page <= totalPages && posts.length < 50_000; page += 1) {
    const nextPage = await getBlogPage(page);
    if (!nextPage?.posts.length) break;
    posts.push(...nextPage.posts);
  }

  return posts.slice(0, 50_000);
}

export async function getBlogPost(
  slug: string,
): Promise<PublicBlogPost | null> {
  const payload = await fetchPublicApi<{ post: PublicBlogPost }>(
    `/customer/blogs/${encodeURIComponent(slug)}`,
    60,
  );
  return payload?.post ?? null;
}

export function formatBlogDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

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

function apiBase(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
  return configured.startsWith("/")
    ? `http://api:4000${configured}`
    : configured.replace(/\/$/, "");
}

export async function getBlogPosts(): Promise<PublicBlogPost[]> {
  try {
    const response = await fetch(`${apiBase()}/customer/blogs`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data?: { posts?: PublicBlogPost[] };
    };
    return payload.data?.posts ?? [];
  } catch {
    return [];
  }
}

export async function getBlogPost(
  slug: string,
): Promise<PublicBlogPost | null> {
  try {
    const response = await fetch(
      `${apiBase()}/customer/blogs/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: { post?: PublicBlogPost };
    };
    return payload.data?.post ?? null;
  } catch {
    return null;
  }
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

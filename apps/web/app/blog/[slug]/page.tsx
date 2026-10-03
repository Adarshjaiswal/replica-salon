import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import BlogLayout from "../BlogLayout";
import { formatBlogDate, getBlogPost } from "../blog-data";

interface Props {
  params: Promise<{ slug: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverImageUrl
        ? [{ url: post.coverImageUrl, alt: post.coverImageAlt ?? post.title }]
        : undefined,
    },
  };
}
export default async function BlogArticlePage({
  params,
}: Props): Promise<React.ReactElement> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post?.body) notFound();
  const blocks = post.body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <BlogLayout>
      <article className="blog-article">
        <a className="blog-back" href="/blog">
          <ArrowLeft size={17} />
          All articles
        </a>
        <header>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div>
            <span>
              <CalendarDays size={16} />
              {formatBlogDate(post.publishedAt)}
            </span>
            {post.authorName ? (
              <span>
                <UserRound size={16} />
                {post.authorName}
              </span>
            ) : null}
          </div>
        </header>
        {post.coverImageUrl ? (
          <img
            className="blog-article-cover"
            alt={post.coverImageAlt ?? post.title}
            src={post.coverImageUrl}
          />
        ) : null}
        <div className="blog-article-body">
          {blocks.map((block, index) =>
            block.startsWith("## ") ? (
              <h2 key={index}>{block.slice(3)}</h2>
            ) : block.startsWith("### ") ? (
              <h3 key={index}>{block.slice(4)}</h3>
            ) : (
              <p key={index}>{block}</p>
            ),
          )}
        </div>
        <aside>
          <strong>Ready for salon care at home?</strong>
          <p>Explore beauty services available across Lucknow.</p>
          <a href="/services">Browse services</a>
        </aside>
      </article>
    </BlogLayout>
  );
}

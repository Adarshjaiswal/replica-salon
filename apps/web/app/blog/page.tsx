import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { BRAND_NAME } from "../brand";
import { createPageMetadata } from "../seo";
import BlogLayout from "./BlogLayout";
import { formatBlogDate, getBlogPosts } from "./blog-data";

export const metadata: Metadata = createPageMetadata({
  title: "Beauty and Home Salon Blog in Lucknow",
  description: `Salon, beauty care and home salon advice from ${BRAND_NAME} in Lucknow.`,
  path: "/blog",
  keywords: [
    "beauty tips Lucknow",
    "home salon tips",
    "skin care and hair care blog",
  ],
});

export default async function BlogPage(): Promise<React.ReactElement> {
  const posts = await getBlogPosts();
  return (
    <BlogLayout>
      <section className="blog-hero">
        <p>
          <BookOpen size={17} />
          Beauty notes
        </p>
        <h1>Salon care, made useful.</h1>
        <span>
          Practical guides for beauty, grooming and getting the best from your
          home salon appointment.
        </span>
      </section>
      <section className="blog-index">
        <div className="blog-index-heading">
          <div>
            <p>Latest articles</p>
            <h2>From our beauty desk</h2>
          </div>
          <span>
            {posts.length} {posts.length === 1 ? "article" : "articles"}
          </span>
        </div>
        {posts.length ? (
          <div className="blog-grid">
            {posts.map((post) => (
              <article className="blog-card" key={post.publicId}>
                {post.coverImageUrl ? (
                  <img
                    alt={post.coverImageAlt ?? ""}
                    src={post.coverImageUrl}
                  />
                ) : (
                  <div className="blog-card-placeholder">
                    <BookOpen size={34} />
                  </div>
                )}
                <div>
                  <time dateTime={post.publishedAt ?? undefined}>
                    {formatBlogDate(post.publishedAt)}
                  </time>
                  <h2>
                    <a href={`/blog/${post.slug}`}>{post.title}</a>
                  </h2>
                  <p>{post.excerpt}</p>
                  <a className="blog-read-link" href={`/blog/${post.slug}`}>
                    Read article <ArrowRight size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="blog-empty">
            <BookOpen size={36} />
            <h2>Fresh stories are on the way</h2>
            <p>
              Our first salon and home-care guides will appear here after they
              are published.
            </p>
          </div>
        )}
      </section>
    </BlogLayout>
  );
}

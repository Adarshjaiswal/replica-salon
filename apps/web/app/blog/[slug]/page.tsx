import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import StructuredData from "../../StructuredData";
import { BRAND_NAME } from "../../brand";
import {
  absoluteUrl,
  brandedTitle,
  conciseDescription,
  DEFAULT_SOCIAL_IMAGE,
  SITE_URL,
} from "../../seo";
import BlogLayout from "../BlogLayout";
import { formatBlogDate, getBlogPost } from "../blog-data";

interface Props {
  params: Promise<{ slug: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  }

  const title = brandedTitle(post.seoTitle || post.title);
  const description = conciseDescription(post.seoDescription || post.excerpt);
  const canonical = absoluteUrl(`/blog/${post.slug}`);
  const image = post.coverImageUrl
    ? absoluteUrl(post.coverImageUrl)
    : DEFAULT_SOCIAL_IMAGE;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: BRAND_NAME,
      locale: "en_IN",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: post.authorName ? [post.authorName] : [BRAND_NAME],
      images: [{ url: image, alt: post.coverImageAlt ?? post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
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
  const articleUrl = absoluteUrl(`/blog/${post.slug}`);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${articleUrl}#article`,
      headline: post.title,
      description: post.seoDescription || post.excerpt,
      image: post.coverImageUrl
        ? [absoluteUrl(post.coverImageUrl)]
        : [DEFAULT_SOCIAL_IMAGE],
      datePublished: post.publishedAt ?? undefined,
      dateModified: post.updatedAt,
      mainEntityOfPage: articleUrl,
      author: post.authorName
        ? { "@type": "Person", name: post.authorName }
        : { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
      publisher: {
        "@type": "Organization",
        name: BRAND_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: DEFAULT_SOCIAL_IMAGE,
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: absoluteUrl("/blog"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: articleUrl,
        },
      ],
    },
  ];

  return (
    <BlogLayout>
      <StructuredData data={structuredData} />
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

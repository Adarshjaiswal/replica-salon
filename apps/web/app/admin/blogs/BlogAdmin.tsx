"use client";

import {
  ArrowLeft,
  Edit3,
  FileText,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: Status;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}
interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  coverImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  status: Status;
}
const EMPTY: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  coverImageUrl: "",
  coverImageAlt: "",
  seoTitle: "",
  seoDescription: "",
  status: "DRAFT",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data)
    throw new Error(payload.error?.message ?? "Request failed.");
  return payload.data;
}
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BlogAdmin(): React.ReactElement {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  async function load(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (status !== "ALL") params.set("status", status);
      const data = await api<{ posts: Post[] }>(`/admin/blogs?${params}`);
      setPosts(data.posts);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load blogs.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [status]);
  function open(post: Post | "new"): void {
    setEditing(post);
    setError(null);
    setNotice(null);
    setForm(
      post === "new"
        ? EMPTY
        : {
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            body: post.body,
            coverImageUrl: post.coverImageUrl ?? "",
            coverImageAlt: post.coverImageAlt ?? "",
            seoTitle: post.seoTitle ?? "",
            seoDescription: post.seoDescription ?? "",
            status: post.status,
          },
    );
  }
  function field<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const path =
        editing === "new" ? "/admin/blogs" : `/admin/blogs/${editing?.id}`;
      await api(path, {
        method: editing === "new" ? "POST" : "PUT",
        body: JSON.stringify({
          ...form,
          slug: form.slug || undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          coverImageAlt: form.coverImageAlt || undefined,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
        }),
      });
      setNotice(
        editing === "new" ? "Blog post created." : "Blog post updated.",
      );
      setEditing(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the blog.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read image."));
        reader.readAsDataURL(file);
      });
      const data = await api<{ image: { url: string } }>(
        "/admin/media/images",
        {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            dataBase64,
            altText: form.coverImageAlt || form.title,
          }),
        },
      );
      field("coverImageUrl", data.image.url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload image.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function archive(post: Post): Promise<void> {
    if (!window.confirm(`Archive “${post.title}”?`)) return;
    setBusy(true);
    try {
      await api(`/admin/blogs/${post.id}`, { method: "DELETE" });
      setNotice("Blog post archived.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not archive post.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout(): Promise<void> {
    try {
      await api("/admin/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin";
    }
  }
  if (editing)
    return (
      <main className="blog-admin">
        <header className="blog-admin-top">
          <button
            className="blog-admin-icon"
            onClick={() => setEditing(null)}
            title="Back"
            type="button"
          >
            <ArrowLeft />
          </button>
          <div>
            <span>Content</span>
            <h1>{editing === "new" ? "Create blog post" : "Edit blog post"}</h1>
          </div>
          <button
            className="blog-admin-primary"
            disabled={busy}
            form="blog-form"
            type="submit"
          >
            <Save size={18} />
            {busy ? "Saving..." : "Save post"}
          </button>
        </header>
        {error ? <p className="blog-admin-alert error">{error}</p> : null}
        <form className="blog-admin-form" id="blog-form" onSubmit={save}>
          <section>
            <h2>Article</h2>
            <label>
              Title
              <input
                required
                maxLength={180}
                value={form.title}
                onChange={(e) => {
                  field("title", e.target.value);
                  if (editing === "new") field("slug", slugify(e.target.value));
                }}
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(e) => field("slug", slugify(e.target.value))}
              />
            </label>
            <label>
              Excerpt
              <textarea
                required
                minLength={10}
                maxLength={500}
                value={form.excerpt}
                onChange={(e) => field("excerpt", e.target.value)}
              />
            </label>
            <label>
              Article body{" "}
              <small>
                Use a blank line between paragraphs. Start headings with ##.
              </small>
              <textarea
                className="blog-body-input"
                required
                minLength={50}
                value={form.body}
                onChange={(e) => field("body", e.target.value)}
              />
            </label>
          </section>
          <aside>
            <h2>Publishing</h2>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => field("status", e.target.value as Status)}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <h2>Cover image</h2>
            {form.coverImageUrl ? (
              <div className="blog-admin-cover">
                <img alt={form.coverImageAlt} src={form.coverImageUrl} />
                <button
                  type="button"
                  onClick={() => field("coverImageUrl", "")}
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}
            <label className="blog-upload">
              <ImagePlus size={18} />
              Upload image
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
            <label>
              Image alt text
              <input
                maxLength={240}
                value={form.coverImageAlt}
                onChange={(e) => field("coverImageAlt", e.target.value)}
              />
            </label>
            <h2>Search preview</h2>
            <label>
              SEO title
              <input
                maxLength={180}
                value={form.seoTitle}
                onChange={(e) => field("seoTitle", e.target.value)}
              />
            </label>
            <label>
              SEO description
              <textarea
                maxLength={320}
                value={form.seoDescription}
                onChange={(e) => field("seoDescription", e.target.value)}
              />
            </label>
          </aside>
        </form>
      </main>
    );
  return (
    <main className="blog-admin">
      <header className="blog-admin-top">
        <a className="blog-admin-icon" href="/admin" title="Admin dashboard">
          <ArrowLeft />
        </a>
        <div>
          <span>Content</span>
          <h1>Blogs</h1>
        </div>
        <button
          className="blog-admin-logout"
          onClick={() => void logout()}
          type="button"
        >
          <LogOut size={17} />
          Logout
        </button>
        <button
          className="blog-admin-primary"
          onClick={() => open("new")}
          type="button"
        >
          <Plus size={18} />
          New post
        </button>
      </header>
      {notice ? <p className="blog-admin-alert success">{notice}</p> : null}
      {error ? <p className="blog-admin-alert error">{error}</p> : null}
      <section className="blog-admin-list">
        <form
          className="blog-admin-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label>
            <Search size={18} />
            <input
              aria-label="Search blogs"
              placeholder="Search title or excerpt"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "ALL")}
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button type="submit">Search</button>
        </form>
        {busy && !posts.length ? (
          <div className="blog-admin-empty">Loading posts...</div>
        ) : posts.length ? (
          <div className="blog-admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <span>/{post.slug}</span>
                    </td>
                    <td>
                      <span
                        className={`blog-status ${post.status.toLowerCase()}`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-IN")
                        : "Not published"}
                    </td>
                    <td>
                      {new Date(post.updatedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <button
                        onClick={() => open(post)}
                        title="Edit"
                        type="button"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        disabled={post.status === "ARCHIVED"}
                        onClick={() => void archive(post)}
                        title="Archive"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="blog-admin-empty">
            <FileText size={38} />
            <h2>No blog posts yet</h2>
            <p>Create your first salon or home salon article.</p>
          </div>
        )}
      </section>
    </main>
  );
}

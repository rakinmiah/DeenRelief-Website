"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  savePostAction,
  submitForReviewAction,
  publishAction,
  unpublishAction,
  returnToDraftAction,
  archiveAction,
} from "@/app/admin/blog/actions";
import type { AdminBlogPost } from "@/lib/blog-admin";
import type { BlogFaq } from "@/lib/blog";

/**
 * The blog CMS editor — a TipTap WYSIWYG body plus the post's metadata
 * (title, slug, description, category, hero image) and an editable FAQ
 * list. Used for both new drafts and existing posts.
 *
 * Workflow buttons shown depend on (a) the post status and (b) whether
 * the signed-in user is an admin. Writers can save + submit for review;
 * only admins publish. The server actions re-check authorisation, so
 * the buttons here are UX, not the security boundary.
 */

const STATUS_LABEL: Record<AdminBlogPost["status"], string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

const STATUS_STYLE: Record<AdminBlogPost["status"], string> = {
  draft: "bg-grey-light text-grey",
  in_review: "bg-amber-light text-amber-dark",
  published: "bg-green-light text-green",
  archived: "bg-red-50 text-red-600",
};

export default function BlogEditor({
  post,
  isAdmin,
}: {
  post: AdminBlogPost;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [description, setDescription] = useState(post.description);
  const [category, setCategory] = useState(post.category);
  const [heroImage, setHeroImage] = useState(post.heroImage ?? "");
  const [faqs, setFaqs] = useState<BlogFaq[]>(post.faqs ?? []);
  const [status, setStatus] = useState(post.status);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHero, setUploadingHero] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({
        placeholder: "Write the article here… Use the toolbar for headings, lists, links and images.",
      }),
    ],
    content: post.bodyHtml || "",
    editorProps: {
      attributes: {
        class:
          "dr-prose focus:outline-none min-h-[420px] px-5 py-4",
      },
    },
  });

  function collectInput() {
    return {
      title,
      slug,
      description,
      category,
      heroImage: heroImage.trim() || null,
      bodyHtml: editor?.getHTML() ?? post.bodyHtml,
      faqs,
    };
  }

  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setMessage({ kind, text });
    if (kind === "ok") {
      window.setTimeout(() => setMessage(null), 3000);
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await savePostAction(post.id, collectInput());
      if (!res.ok) {
        flash("err", res.error ?? "Couldn't save.");
        return;
      }
      if (res.slug && res.slug !== slug) setSlug(res.slug);
      flash("ok", "Saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    setBusy("submit");
    setMessage(null);
    try {
      const res = await submitForReviewAction(post.id, collectInput());
      if (!res.ok) {
        flash("err", res.error ?? "Couldn't submit.");
        return;
      }
      if (res.slug && res.slug !== slug) setSlug(res.slug);
      setStatus("in_review");
      flash("ok", "Submitted for review.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function runTransition(
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    optimisticStatus: AdminBlogPost["status"],
    okText: string
  ) {
    setBusy(key);
    setMessage(null);
    try {
      // Persist any in-flight edits first so a publish reflects the
      // latest body, then transition.
      if (key === "publish") {
        const saved = await savePostAction(post.id, collectInput());
        if (!saved.ok) {
          flash("err", saved.error ?? "Couldn't save before publishing.");
          return;
        }
        if (saved.slug && saved.slug !== slug) setSlug(saved.slug);
      }
      const res = await fn();
      if (!res.ok) {
        flash("err", res.error ?? "Action failed.");
        return;
      }
      setStatus(optimisticStatus);
      flash("ok", okText);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/media/upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      flash("err", body?.error ?? "Image upload failed.");
      return null;
    }
    const body = await res.json();
    return body?.media?.publicUrl ?? null;
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const url = await uploadImage(file);
      if (url) setHeroImage(url);
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  }

  const archived = status === "archived";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={() => router.push("/admin/blog")}
          className="text-sm text-grey hover:text-green transition-colors"
        >
          ← All posts
        </button>
        <span
          className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {message && (
        <div
          role="status"
          className={`mb-5 px-4 py-2.5 rounded-lg text-sm ${
            message.kind === "ok"
              ? "bg-green-light text-green"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        className="w-full text-3xl font-heading font-bold text-charcoal placeholder:text-charcoal/25 bg-transparent border-0 border-b border-charcoal/10 focus:border-green focus:outline-none pb-2 mb-6"
      />

      {/* Meta grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Field label="URL slug" hint="The /blog/… address. Auto-filled from the title.">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-post"
            className="dr-input"
          />
        </Field>
        <Field label="Category" hint="e.g. Zakat, Sadaqah">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Sadaqah"
            className="dr-input"
          />
        </Field>
      </div>

      <Field
        label="Meta description / excerpt"
        hint={`${description.length}/160 — shown on cards and in Google results.`}
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="A one or two sentence summary of the article."
          className="dr-input resize-none"
        />
      </Field>

      {/* Hero image */}
      <div className="my-6">
        <label className="block text-sm font-medium text-charcoal mb-1.5">
          Hero image
        </label>
        {heroImage ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt="Hero preview"
              className="rounded-xl max-h-48 border border-charcoal/10"
            />
            <button
              onClick={() => setHeroImage("")}
              className="absolute top-2 right-2 bg-charcoal/70 text-white text-xs px-2 py-1 rounded-md hover:bg-charcoal"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => heroInputRef.current?.click()}
              disabled={uploadingHero}
              className="px-3.5 py-2 text-sm rounded-lg border border-charcoal/15 hover:border-green hover:text-green transition-colors disabled:opacity-50"
            >
              {uploadingHero ? "Uploading…" : "Upload image"}
            </button>
            <input
              value={heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
              placeholder="…or paste an image URL"
              className="dr-input flex-1"
            />
          </div>
        )}
        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          onChange={handleHeroUpload}
          className="hidden"
        />
      </div>

      {/* Body editor */}
      <label className="block text-sm font-medium text-charcoal mb-1.5">
        Article body
      </label>
      <div className="border border-charcoal/15 rounded-xl overflow-hidden bg-white">
        {editor && <Toolbar editor={editor} onUploadImage={uploadImage} />}
        <EditorContent editor={editor} />
      </div>

      {/* FAQs */}
      <FaqEditor faqs={faqs} setFaqs={setFaqs} />

      {/* Action bar */}
      <div className="sticky bottom-0 mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-cream/95 backdrop-blur border-t border-charcoal/10 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || archived}
          className="px-4 py-2 rounded-lg bg-charcoal text-white text-sm font-medium hover:bg-charcoal/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : status === "published" ? "Save changes" : "Save draft"}
        </button>

        {(status === "draft" || status === "in_review") && (
          <button
            onClick={handleSubmitForReview}
            disabled={busy !== null || saving}
            className="px-4 py-2 rounded-lg border border-green text-green text-sm font-medium hover:bg-green-light disabled:opacity-50"
          >
            {busy === "submit" ? "Submitting…" : status === "in_review" ? "Re-submit" : "Submit for review"}
          </button>
        )}

        {isAdmin && status !== "published" && !archived && (
          <button
            onClick={() =>
              runTransition("publish", () => publishAction(post.id), "published", "Published — now live.")
            }
            disabled={busy !== null || saving}
            className="px-4 py-2 rounded-lg bg-green text-white text-sm font-medium hover:bg-green-dark disabled:opacity-50"
          >
            {busy === "publish" ? "Publishing…" : "Publish"}
          </button>
        )}

        {isAdmin && status === "published" && (
          <button
            onClick={() =>
              runTransition("unpublish", () => unpublishAction(post.id), "draft", "Unpublished.")
            }
            disabled={busy !== null || saving}
            className="px-4 py-2 rounded-lg border border-amber-dark text-amber-dark text-sm font-medium hover:bg-amber-light disabled:opacity-50"
          >
            {busy === "unpublish" ? "…" : "Unpublish"}
          </button>
        )}

        {isAdmin && status === "in_review" && (
          <button
            onClick={() =>
              runTransition("return", () => returnToDraftAction(post.id), "draft", "Returned to draft.")
            }
            disabled={busy !== null || saving}
            className="px-4 py-2 rounded-lg border border-charcoal/20 text-grey text-sm font-medium hover:border-charcoal/40 disabled:opacity-50"
          >
            Return to draft
          </button>
        )}

        <div className="flex-1" />

        {!archived && (
          <button
            onClick={() => {
              if (confirm("Archive this post? It will be removed from the public site but kept for your records.")) {
                runTransition("archive", () => archiveAction(post.id), "archived", "Archived.");
              }
            }}
            disabled={busy !== null || saving}
            className="px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-charcoal mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-grey/70 mt-1">{hint}</p>}
    </div>
  );
}

function Toolbar({
  editor,
  onUploadImage,
}: {
  editor: Editor;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const imgInputRef = useRef<HTMLInputElement>(null);

  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  async function onImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await onUploadImage(file);
    if (url) editor.chain().focus().setImage({ src: url }).run();
    if (imgInputRef.current) imgInputRef.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-charcoal/10 bg-grey-light/50 px-2 py-1.5">
      <Tb active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
        <span className="font-bold">B</span>
      </Tb>
      <Tb active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
        <span className="italic font-serif">i</span>
      </Tb>
      <Sep />
      <Tb active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2">
        H2
      </Tb>
      <Tb active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3">
        H3
      </Tb>
      <Sep />
      <Tb active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bulleted list">
        • List
      </Tb>
      <Tb active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
        1. List
      </Tb>
      <Tb active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">
        ❝
      </Tb>
      <Sep />
      <Tb active={editor.isActive("link")} onClick={setLink} label="Link">
        Link
      </Tb>
      <Tb active={false} onClick={() => imgInputRef.current?.click()} label="Insert image">
        Image
      </Tb>
      <Sep />
      <Tb active={false} onClick={() => editor.chain().focus().undo().run()} label="Undo">
        ↶
      </Tb>
      <Tb active={false} onClick={() => editor.chain().focus().redo().run()} label="Redo">
        ↷
      </Tb>
      <input ref={imgInputRef} type="file" accept="image/*" onChange={onImagePicked} className="hidden" />
    </div>
  );
}

function Tb({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors ${
        active ? "bg-green text-white" : "text-charcoal hover:bg-charcoal/10"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-charcoal/10 mx-1" />;
}

function FaqEditor({
  faqs,
  setFaqs,
}: {
  faqs: BlogFaq[];
  setFaqs: (f: BlogFaq[]) => void;
}) {
  function update(i: number, key: keyof BlogFaq, value: string) {
    setFaqs(faqs.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));
  }
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-charcoal">
          FAQs <span className="font-normal text-grey/70">(optional — power Google&apos;s “People also ask”)</span>
        </h3>
        <button
          type="button"
          onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
          className="text-sm text-green hover:text-green-dark font-medium"
        >
          + Add FAQ
        </button>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-charcoal/10 rounded-lg p-3 bg-white">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <input
                  value={faq.question}
                  onChange={(e) => update(i, "question", e.target.value)}
                  placeholder="Question"
                  className="dr-input"
                />
                <textarea
                  value={faq.answer}
                  onChange={(e) => update(i, "answer", e.target.value)}
                  placeholder="Answer (2–3 sentences)"
                  rows={2}
                  className="dr-input resize-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
                aria-label="Remove FAQ"
                className="text-grey/50 hover:text-red-600 text-lg leading-none mt-1"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

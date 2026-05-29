import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireBlogAccess } from "@/lib/admin-session";
import { getPostById } from "@/lib/blog-admin";
import BlogEditor from "@/components/admin/BlogEditor";

export const metadata: Metadata = { title: "Edit post | Deen Relief Admin" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireBlogAccess();
  const isAdmin = session.role === "admin";

  const post = await getPostById(id);
  if (!post) notFound();

  // Writers may only open their own posts; bounce others back to the list.
  if (!isAdmin && post.authorEmail.toLowerCase() !== session.email.toLowerCase()) {
    redirect("/admin/blog");
  }

  return <BlogEditor post={post} isAdmin={isAdmin} />;
}

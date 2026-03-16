import { redirect } from "next/navigation";

export default async function BookIndex({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/corpus/${resolvedParams.book}`);
}

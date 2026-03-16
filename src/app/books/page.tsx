import { redirect } from "next/navigation";

export const metadata = {
  title: "Legacy Books Redirect",
  description:
    "Legacy route preserved for compatibility; redirects to the corpus view.",
};

export default async function BooksIndex() {
  redirect("/corpus");
}

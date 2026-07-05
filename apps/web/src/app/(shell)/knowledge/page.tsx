import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Knowledge Hub" };

const item = NAV_ITEMS.find((i) => i.href === "/knowledge")!;

export default function KnowledgePage() {
  return <PagePlaceholder item={item} />;
}

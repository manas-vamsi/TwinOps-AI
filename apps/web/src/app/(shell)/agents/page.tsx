import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "AI Agents" };

const item = NAV_ITEMS.find((i) => i.href === "/agents")!;

export default function AgentsPage() {
  return <PagePlaceholder item={item} />;
}

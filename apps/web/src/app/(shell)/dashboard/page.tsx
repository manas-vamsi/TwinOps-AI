import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Dashboard" };

const item = NAV_ITEMS.find((i) => i.href === "/dashboard")!;

export default function DashboardPage() {
  return <PagePlaceholder item={item} />;
}

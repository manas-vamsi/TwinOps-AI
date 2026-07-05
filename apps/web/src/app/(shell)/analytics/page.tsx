import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Analytics" };

const item = NAV_ITEMS.find((i) => i.href === "/analytics")!;

export default function AnalyticsPage() {
  return <PagePlaceholder item={item} />;
}

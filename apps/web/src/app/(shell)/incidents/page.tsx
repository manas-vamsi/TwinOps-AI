import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Incidents" };

const item = NAV_ITEMS.find((i) => i.href === "/incidents")!;

export default function IncidentsPage() {
  return <PagePlaceholder item={item} />;
}

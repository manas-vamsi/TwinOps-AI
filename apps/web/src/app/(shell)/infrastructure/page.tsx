import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Infrastructure" };

const item = NAV_ITEMS.find((i) => i.href === "/infrastructure")!;

export default function InfrastructurePage() {
  return <PagePlaceholder item={item} />;
}

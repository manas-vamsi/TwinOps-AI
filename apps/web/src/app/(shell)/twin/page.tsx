import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Digital Twin" };

const item = NAV_ITEMS.find((i) => i.href === "/twin")!;

export default function TwinPage() {
  return <PagePlaceholder item={item} />;
}

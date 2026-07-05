import type { Metadata } from "next";
import { NAV_ITEMS } from "@/components/shell/navigation";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Settings" };

const item = NAV_ITEMS.find((i) => i.href === "/settings")!;

export default function SettingsPage() {
  return <PagePlaceholder item={item} />;
}

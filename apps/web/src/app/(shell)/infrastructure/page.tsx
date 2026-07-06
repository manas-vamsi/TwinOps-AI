import type { Metadata } from "next";
import { InfrastructureView } from "@/features/infrastructure/InfrastructureView";

export const metadata: Metadata = { title: "Infrastructure" };

export default function InfrastructurePage() {
  return <InfrastructureView />;
}

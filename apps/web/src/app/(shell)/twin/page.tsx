import type { Metadata } from "next";
import { TwinView } from "@/features/twin/TwinView";

export const metadata: Metadata = { title: "Digital Twin" };

export default function TwinPage() {
  return <TwinView />;
}

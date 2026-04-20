import type { Metadata } from "next";
import { DemoSite } from "@/components/demo/demo-site";
import { WidgetInit } from "./widget-init";

export const metadata: Metadata = {
  title: "Live Demo",
  description: "Try CCM Feedback live — draw annotations, leave comments, directly on a demo website.",
  openGraph: {
    title: "CCM Feedback — Live Demo",
    description: "Try CCM Feedback live — draw annotations, leave comments, directly on a demo website.",
    url: "https://feedback.ccmdesign.ca/demo",
  },
};

export default function DemoPage() {
  return (
    <>
      <WidgetInit />
      <DemoSite />
    </>
  );
}

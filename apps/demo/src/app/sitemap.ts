import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://feedback.ccmdesign.ca", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: "https://feedback.ccmdesign.ca/demo",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/files/", "/bookmark/", "/history/", "/setting/"],
      },
    ],
    sitemap: "https://ryukomik.my.id/sitemap.xml",
  };
}

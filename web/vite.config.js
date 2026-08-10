import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const normalizeSiteUrl = (value) => {
  return String(value || "http://localhost:8080").replace(/\/+$/, "");
};

const siteUrl = normalizeSiteUrl(process.env.VITE_PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL);
const buildDate = new Date().toISOString();

const seoPlugin = () => ({
  name: "inclusive-hire-seo",
  transformIndexHtml(html) {
    return html
      .replaceAll("%PUBLIC_SITE_URL%", siteUrl)
      .replaceAll("%BUILD_DATE%", buildDate);
  },
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "robots.txt",
      source: [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /uploads/",
        `Sitemap: ${siteUrl}/sitemap.xml`,
        ""
      ].join("\n")
    });

    this.emitFile({
      type: "asset",
      fileName: "sitemap.xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${buildDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
    });
  }
});

export default defineConfig({
  plugins: [react(), seoPlugin()]
});

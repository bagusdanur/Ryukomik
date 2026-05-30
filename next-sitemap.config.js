/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://www.ryukomik.my.id",
  generateRobotsTxt: true,
  generateIndexSitemap: true,
  sitemapSize: 5000,

  exclude: [
    '/auth/*',
    '/dashboard',
    '/dashboard/*',
    '/bookmark',
    '/history',
    '/setting',
    '/setting/*',
    '/files',
    '/files/*',
    '/komentar',
    '/icon.png',
    '/robots.txt',
    '/sitemap.xml',
    '/sitemap-*.xml',
  ],

  additionalPaths: async (config) => {
    const results = [];

    try {
      // =============================
      // 1. KOMIK — page 1 saja
      // =============================
      const komikRes = await fetch(
        `https://mgkomik-backend-three.vercel.app/komiku/pustaka-filter?page=1&orderby=modified`
      );
      const komikJson = await komikRes.json();
      const komikItems = komikJson.data || [];

      for (const item of komikItems) {
        if (!item.slug) continue;
        results.push({
          loc: `/komik/${item.slug}`,
          changefreq: 'weekly',
          priority: 0.8,
          lastmod: new Date().toISOString(),
        });
      }

      console.log(`📚 Komik: ${komikItems.length} URL`);

      // =============================
      // 2. ANIME — page 1 saja
      // =============================
      try {
        const animeRes = await fetch(
          `https://mgkomik-backend-three.vercel.app/anime/list?page=1`
        );
        const animeJson = await animeRes.json();
        const animeItems = animeJson.data || [];

        for (const item of animeItems) {
          if (!item.slug) continue;
          results.push({
            loc: `/anime/${item.slug}`,
            changefreq: 'weekly',
            priority: 0.7,
            lastmod: new Date().toISOString(),
          });
        }

        console.log(`🎬 Anime: ${animeItems.length} URL`);
      } catch (e) {
        console.warn('Gagal fetch anime:', e.message);
      }

    } catch (e) {
      console.error('Error generate sitemap:', e.message);
    }

    console.log(`✅ Total URL sitemap tambahan: ${results.length}`);
    return results;
  },

  transform: async (config, path) => {
    if (path === '/') {
      return { loc: path, changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString() };
    }
    if (['/list-komik', '/terbaru', '/anime/terbaru', '/anime/ongoing'].includes(path)) {
      return { loc: path, changefreq: 'daily', priority: 0.8, lastmod: new Date().toISOString() };
    }
    if (['/about', '/help', '/privacy-policy', '/terms-of-service'].includes(path)) {
      return { loc: path, changefreq: 'monthly', priority: 0.4, lastmod: new Date().toISOString() };
    }
    return { loc: path, changefreq: 'weekly', priority: 0.6, lastmod: new Date().toISOString() };
  },
};
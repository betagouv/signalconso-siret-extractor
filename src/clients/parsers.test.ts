import {parseSitemap} from './parsers'

describe('Parsers', () => {
  describe('parseSitemap', () => {
    test('should correctly extract pages 1', async () => {
      const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url>
          <loc>https://figurinemangafrance.fr/pages/conditions-generales-de-ventes</loc>
          <lastmod>2023-06-30T05:46:38+02:00</lastmod>
          <changefreq>weekly</changefreq>
        </url>
        <url>
          <loc>https://figurinemangafrance.fr/pages/mentions-legales</loc>
          <lastmod>2023-06-30T05:47:00+02:00</lastmod>
          <changefreq>weekly</changefreq>
        </url>
      </urlset>
      `

      const result = await parseSitemap(xml)
      expect(result).toEqual([
        'https://figurinemangafrance.fr/pages/conditions-generales-de-ventes',
        'https://figurinemangafrance.fr/pages/mentions-legales',
      ])
    }),
      test('should correctly extract pages 2', async () => {
        const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url>
          <loc><![CDATA[https://www.piscineco.fr/marques]]></loc>
          <priority>1.0</priority>
          <changefreq>weekly</changefreq>
        </url>
        <url>
          <loc><![CDATA[https://www.piscineco.fr/code-promotion]]></loc>
          <priority>0.1</priority>
          <changefreq>weekly</changefreq>
        </url>
      </urlset>
      `

        const result = await parseSitemap(xml)
        expect(result).toEqual(['https://www.piscineco.fr/marques', 'https://www.piscineco.fr/code-promotion'])
      })
  })
})

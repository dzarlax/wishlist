const cheerio = require('cheerio');

/**
 * Extract Open Graph / meta tag metadata from a URL.
 * Returns { title, description, image, url }
 */
async function extractMetadata(url) {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 10000
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const metadata = {
    title: $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text() ||
            null,
    description: $('meta[property="og:description"]').attr('content') ||
                 $('meta[name="twitter:description"]').attr('content') ||
                 $('meta[name="description"]').attr('content') ||
                 null,
    image: $('meta[property="og:image"]').attr('content') ||
           $('meta[name="twitter:image"]').attr('content') ||
           $('link[rel="image_src"]').attr('href') ||
           null,
    url: $('meta[property="og:url"]').attr('content') || url
  };

  // Resolve relative image URLs
  if (metadata.image && !metadata.image.startsWith('http')) {
    try {
      const baseUrl = new URL(url);
      metadata.image = new URL(metadata.image, baseUrl.origin).href;
    } catch {
      metadata.image = null;
    }
  }

  return metadata;
}

module.exports = { extractMetadata };

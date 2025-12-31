const cheerio = require('cheerio');

(async () => {
  const url = 'https://www.praktiker.hu/csemperagaszto-nagymeretu-burkolatokhoz/cc/4108';
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== PRAKTIKER CATEGORY PAGE - Ez kategória oldal, SKIP ===');
  console.log('\nMost próbáljunk egy KONKRÉT terméket:');

  // Keressünk egy konkrét Bauhaus terméket amit nem blokkolt
  const bauUrl = 'https://www.bauhaus.hu/csemperagaszto/probau-c1t-csemperagaszto-25kg/29732007.html';
  console.log('\nTesting Bauhaus product:', bauUrl);

  try {
    const resp2 = await fetch(bauUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('Status:', resp2.status);

    if (resp2.ok) {
      const html2 = await resp2.text();
      const $2 = cheerio.load(html2);

      // Keressünk árat
      console.log('\n=== PRICE SEARCH ===');
      const priceSelectors = [
        '.product-price',
        '[class*="price"]',
        '[itemprop="price"]',
        '.price-value',
      ];

      for (const sel of priceSelectors) {
        const text = $2(sel).first().text().trim();
        if (text) {
          console.log(`Selector "${sel}":`, text.substring(0, 100));
        }
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
})();

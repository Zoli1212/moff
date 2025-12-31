const cheerio = require('cheerio');

(async () => {
  const response = await fetch('https://www.obi.hu/alapozok-folttakaro-festekek/trinat-alapozo-univerzalis-100-feher-0-75-l/p/1140482', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== CHECKING FOR SCHEMA.ORG ===');
  let found = false;
  $('script[type="application/ld+json"]').each((i, el) => {
    const content = $(el).html();
    console.log(`\nSchema ${i}:`, content.substring(0, 800));
    try {
      const json = JSON.parse(content);
      console.log('Parsed:', JSON.stringify(json, null, 2).substring(0, 500));
    } catch (e) {
      console.log('Parse error:', e.message);
    }
    found = true;
  });

  if (!found) {
    console.log('NO SCHEMA.ORG FOUND');
    console.log('\n=== LOOKING FOR PRICE IN HTML ===');
    console.log('Price spans:', $('span[class*="price"]').length);
    $('span[class*="price"]').slice(0, 5).each((i, el) => {
      console.log(`Price ${i}:`, $(el).attr('class'), $(el).text().trim());
    });
  }
})();

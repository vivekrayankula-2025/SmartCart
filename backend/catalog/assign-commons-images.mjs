
import fs from 'node:fs/promises';

const INPUT = new URL('./products.json', import.meta.url);
const OUTPUT = new URL('./products-with-images.json', import.meta.url);
const CACHE = new URL('./commons-cache.json', import.meta.url);
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'ProductImageAssigner/1.0 (educational catalog project)';

const CATEGORY_SEARCH = {
  Audio: ['wireless headphones', 'earbuds headphones'],
  Laptops: ['laptop computer', 'notebook computer'],
  Mobiles: ['smartphone mobile phone', 'mobile phone'],
  Fashion: ['clothing apparel fashion', 'shoes clothing'],
  Home: ['home appliance kitchen appliance', 'home furniture decor'],
  Gaming: ['video game controller console', 'gaming computer'],
  Cameras: ['digital camera photography camera', 'camera lens'],
  Accessories: ['computer accessories electronics', 'computer mouse keyboard'],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readJson = async (url, fallback) => {
  try { return JSON.parse(await fs.readFile(url, 'utf8')); }
  catch { return fallback; }
};

async function commonsSearch(term, cache) {
  if (cache[term]) return cache[term];
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: '6',
    gsrlimit: '50',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime',
    iiurlwidth: '1200',
    format: 'json',
    formatversion: '2',
  });
  const response = await fetch(`${API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`Wikimedia Commons returned HTTP ${response.status}`);
  const data = await response.json();
  const pages = data.query?.pages ?? [];
  const results = pages.flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info || !info.mime?.startsWith('image/') || info.mime === 'image/svg+xml' || info.mime === 'image/gif') return [];
    const meta = info.extmetadata ?? {};
    const clean = (value) => String(value?.value ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    return [{
      title: page.title,
      url: info.thumburl || info.url,
      description: clean(meta.ImageDescription) || page.title.replace(/^File:/, ''),
      artist: clean(meta.Artist),
      credit: clean(meta.Credit),
      license: clean(meta.LicenseShortName) || 'See file page for license',
      licenseUrl: clean(meta.LicenseUrl),
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    }];
  });
  cache[term] = results;
  await fs.writeFile(CACHE, JSON.stringify(cache, null, 2));
  await sleep(900); // Be polite to the public API.
  return results;
}

const products = JSON.parse(await fs.readFile(INPUT, 'utf8'));
const cache = await readJson(CACHE, {});
const usedTitles = new Set();
const assigned = [];

for (const [category, terms] of Object.entries(CATEGORY_SEARCH)) {
  const group = products.filter((p) => p.category === category);
  if (!group.length) continue;
  let candidates = [];
  for (const term of terms) {
    try {
      const found = await commonsSearch(term, cache);
      for (const item of found) {
        if (!candidates.some((x) => x.title === item.title)) candidates.push(item);
      }
    } catch (error) {
      console.warn(`Search failed for "${term}": ${error.message}`);
    }
  }
  const available = candidates.filter((item) => !usedTitles.has(item.title));
  if (available.length < group.length) {
    console.warn(`Only ${available.length} unique images found for ${category} (${group.length} products). Some products will retain their original image_url.`);
  }
  group.forEach((product, index) => {
    const image = available[index];
    if (!image) return;
    usedTitles.add(image.title);
    product.image_url = image.url;
    product.image_alt = `${product.name} — representative ${category.toLowerCase()} image`;
    product.image_credit = [image.artist, image.credit].filter(Boolean).join(' | ');
    product.image_license = image.license;
    product.image_license_url = image.licenseUrl;
    product.image_source_url = image.pageUrl;
    assigned.push({ product: product.name, file: image.title });
  });
}

await fs.writeFile(OUTPUT, JSON.stringify(products, null, 2));
console.log(`Finished: assigned ${assigned.length} unique Commons images to ${products.length} products.`);
console.log(`Output: ${OUTPUT.pathname}`);
console.log('Review image_source_url and image_license before publishing; follow each file page’s attribution/license terms.');

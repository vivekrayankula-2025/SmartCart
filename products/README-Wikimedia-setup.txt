PRODUCT IMAGE SETUP — WIKIMEDIA COMMONS (NO API KEY)

This version replaces the Pexels setup because Pexels is currently pausing new API key issuance.

WHAT IS INCLUDED
- products.json: your original 120-product catalog
- assign-commons-images.mjs: searches Wikimedia Commons and assigns distinct image files

REQUIREMENTS
- Node.js 18 or newer
- Internet connection
- No API key or account required

HOW TO RUN
1. Extract this ZIP into a folder.
2. Open a terminal/command prompt in that folder.
3. Run:

   node assign-commons-images.mjs

4. The script creates:

   products-with-images.json

The script searches for representative images by product category and avoids reusing the same Commons file across products. Since the product names in the catalog are fictional, images represent the product type rather than the exact model.

IMPORTANT LICENSE NOTES
Wikimedia Commons images have different licenses. The output includes image_credit, image_license, image_license_url, and image_source_url fields when the source provides them. Before publishing, open each image_source_url and follow the attribution and license requirements shown on that file page. Keep attribution visible where required. Do not assume every image has the same license.

TROUBLESHOOTING
- If a search fails, run the script again; successful search results are cached in commons-cache.json.
- If a category has fewer than 15 suitable unique images, some products retain their original placeholder URL. You can rerun later or add more search terms to CATEGORY_SEARCH in the script.
- The script uses the public Wikimedia Commons API politely, with a short pause between searches.

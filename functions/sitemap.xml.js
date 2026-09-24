import { assignSlugs } from "./_utils/slug.js";
import { supabaseRest } from "./_utils/supabase.js";

const SITE_URL = "https://hardwaresikho.pages.dev";

export async function onRequestGet() {

    let rows = [];
    let debugError = "";

    try {

        rows = await supabaseRest(
            "images?select=id,title,category,description,image_url,created_at&order=id.asc"
        );

    } catch (error) {
        rows = [];
        debugError = String(error && error.message ? error.message : error);
    }

    const { idToSlug } = assignSlugs(rows);

    const urlEntries = rows.map(function (row) {

        const slug = idToSlug.get(row.id);
        const loc = `${SITE_URL}/image/${slug}`;
        const lastmod = row.created_at ? new Date(row.created_at).toISOString() : null;
        const caption = escapeXml((row.description && row.description.trim()) || row.title || "");
        const title = escapeXml(row.title || "Hardware image");

        return [
            "  <url>",
            `    <loc>${escapeXml(loc)}</loc>`,
            lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
            "    <image:image>",
            `      <image:loc>${escapeXml(row.image_url)}</image:loc>`,
            `      <image:title>${title}</image:title>`,
            caption ? `      <image:caption>${caption}</image:caption>` : "",
            "    </image:image>",
            "  </url>"
        ].filter(Boolean).join("\n");

    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<!--
DEBUG rows_count=${rows.length}
DEBUG error_chunks:
${(debugError.match(/.{1,40}/g) || ["(no error)"]).join("\n")}
-->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urlEntries}
</urlset>`;

    return new Response(xml, {
        headers: {
            "content-type": "application/xml; charset=UTF-8",
            "cache-control": "public, max-age=1800, s-maxage=3600"
        }
    });

}

function escapeXml(value) {

    return String(value || "").replace(/[<>&'"]/g, function (char) {

        return {
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            "'": "&apos;",
            "\"": "&quot;"
        }[char];

    });

}

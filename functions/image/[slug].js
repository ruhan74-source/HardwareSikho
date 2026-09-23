// Cloudflare Pages Function — handles GET /image/<slug>
//
// Renders a fully server-side HTML page (no client-side JS required) for
// one specific uploaded hardware image, pulled live from the existing
// Supabase "images" table (title, description, tags, category, image_url).
// This is what lets Google (and any crawler) discover, render and index
// each uploaded image on its own unique, permanent URL.

import { slugify, assignSlugs } from "../_utils/slug.js";
import { supabaseRest } from "../_utils/supabase.js";

const SITE_URL = "https://hardwaresikho.pages.dev";
const SITE_NAME = "HardwareSikho";

export async function onRequestGet({ params }) {

    const requestedSlug = String(params.slug || "").toLowerCase().trim();

    if (!requestedSlug) {
        return notFoundResponse();
    }

    let idTitleRows;

    try {

        // Lightweight first — only id + title — so we can resolve the
        // slug -> id without pulling every column for every image on
        // every request.

        idTitleRows = await supabaseRest(
            "images?select=id,title&order=id.asc"
        );

    } catch (error) {

        return serverErrorResponse();

    }

    const { slugToId } = assignSlugs(idTitleRows || []);

    const matchedId = slugToId.get(requestedSlug);

    if (!matchedId) {
        return notFoundResponse();
    }

    let rows;

    try {

        rows = await supabaseRest(
            `images?select=*&id=eq.${matchedId}`
        );

    } catch (error) {

        return serverErrorResponse();

    }

    const image = rows && rows[0];

    if (!image) {
        return notFoundResponse();
    }

    const html = renderImagePage(image, requestedSlug);

    return new Response(html, {
        headers: {
            "content-type": "text/html; charset=UTF-8",
            "cache-control": "public, max-age=600, s-maxage=3600"
        }
    });

}

function escapeHtml(value) {

    return String(value || "").replace(/[&<>"']/g, function (char) {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[char];

    });

}

function renderImagePage(image, slug) {

    const rawTitle = image.title || "Hardware Image";
    const title = escapeHtml(rawTitle);
    const category = escapeHtml(image.category || "");
    const tagsRaw = (image.tags || "").trim();
    const tagList = tagsRaw
        ? tagsRaw.split(",").map(function (tag) { return tag.trim(); }).filter(Boolean)
        : [];

    const description =
        (image.description && image.description.trim()) ||
        `${rawTitle}${image.category ? " — " + image.category : ""} image on ${SITE_NAME}, a free gallery of computer hardware photos.`;

    const escapedDescription = escapeHtml(description);

    const imageUrl = image.image_url;
    const pageUrl = `${SITE_URL}/image/${slug}`;
    const pageTitle = `${title}${category ? " — " + category + " Image" : ""} | ${SITE_NAME}`;
    const isoDate = image.created_at ? new Date(image.created_at).toISOString() : null;

    const imageObjectLd = {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        "contentUrl": imageUrl,
        "url": pageUrl,
        "name": rawTitle,
        "description": description,
        ...(tagList.length ? { "keywords": tagList.join(", ") } : {}),
        ...(isoDate ? { "datePublished": isoDate, "uploadDate": isoDate } : {}),
        "representativeOfPage": true,
        "author": { "@type": "Organization", "name": SITE_NAME },
        "creator": { "@type": "Organization", "name": SITE_NAME },
        "isPartOf": { "@type": "WebSite", "name": SITE_NAME, "url": SITE_URL + "/" }
    };

    const breadcrumbItems = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" }
    ];

    if (category) {
        breadcrumbItems.push({
            "@type": "ListItem",
            "position": 2,
            "name": image.category,
            "item": `${SITE_URL}/?category=${encodeURIComponent(image.category)}`
        });
    }

    breadcrumbItems.push({
        "@type": "ListItem",
        "position": breadcrumbItems.length + 1,
        "name": rawTitle,
        "item": pageUrl
    });

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems
    };

    const tagsHtml = tagList
        .map(function (tag) {
            return `<span class="badge">${escapeHtml(tag)}</span>`;
        })
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle}</title>
<meta name="description" content="${escapedDescription}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${pageUrl}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${pageTitle}">
<meta property="og:description" content="${escapedDescription}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:alt" content="${title}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${pageTitle}">
<meta name="twitter:description" content="${escapedDescription}">
<meta name="twitter:image" content="${imageUrl}">

<link rel="icon" type="image/png" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

<script type="application/ld+json">${JSON.stringify(imageObjectLd)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>

<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Poppins', Arial, sans-serif;
        background: #f8f8fb;
        color: #1c1c28;
        padding: 24px 16px 60px;
        line-height: 1.6;
    }
    .wrap { max-width: 760px; margin: 0 auto; }
    nav.crumbs { font-size: 13px; color: #6f6f85; margin-bottom: 16px; }
    nav.crumbs a { color: #6f6f85; text-decoration: none; }
    nav.crumbs a:hover { text-decoration: underline; color: #111; }
    .card {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(30,20,60,0.10);
        overflow: hidden;
    }
    img.main-image {
        width: 100%;
        height: auto;
        max-height: 70vh;
        object-fit: contain;
        background: #eee;
        display: block;
    }
    .body { padding: 22px 24px 28px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 12px; letter-spacing: -0.3px; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .badge {
        background: #ececf3;
        color: #444;
        border-radius: 20px;
        padding: 5px 13px;
        font-size: 12.5px;
        font-weight: 500;
    }
    .badge.category { background: #111111; color: #fff; }
    p.description { font-size: 14.5px; color: #444; white-space: pre-line; }
    a.home-link {
        display: inline-block;
        margin-top: 22px;
        color: #111;
        font-weight: 500;
        font-size: 14px;
        text-decoration: none;
    }
    a.home-link:hover { text-decoration: underline; }
    footer.site-footer { text-align: center; margin-top: 34px; font-size: 13px; color: #8a8a9c; }
</style>
</head>
<body>
    <div class="wrap">

        <nav class="crumbs" aria-label="Breadcrumb">
            <a href="/">${SITE_NAME}</a>
            ${category ? ` &rsaquo; <a href="/?category=${encodeURIComponent(image.category)}">${category}</a>` : ""}
            &rsaquo; ${title}
        </nav>

        <div class="card">
            <img
                class="main-image"
                src="${imageUrl}"
                alt="${title}${category ? " - " + category : ""}"
                loading="eager"
                fetchpriority="high">

            <div class="body">
                <h1>${title}</h1>

                <div class="badges">
                    ${category ? `<span class="badge category">${category}</span>` : ""}
                    ${tagsHtml}
                </div>

                ${image.description ? `<p class="description">${escapeHtml(image.description)}</p>` : ""}
            </div>
        </div>

        <a class="home-link" href="/">&larr; Browse more hardware images on ${SITE_NAME}</a>

        <footer class="site-footer">
            &copy; ${new Date().getFullYear()} ${SITE_NAME} — Free computer hardware images
        </footer>

    </div>
</body>
</html>`;

}

function notFoundResponse() {

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Image not found — ${SITE_NAME}</title>
<meta name="robots" content="noindex">
<style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 80px 20px; color: #333; }
    a { color: #111; }
</style>
</head>
<body>
    <h1>Image not found</h1>
    <p>This image may have been removed or the link is incorrect.</p>
    <p><a href="/">&larr; Back to ${SITE_NAME}</a></p>
</body>
</html>`;

    return new Response(html, {
        status: 404,
        headers: { "content-type": "text/html; charset=UTF-8" }
    });

}

function serverErrorResponse() {

    return new Response("Something went wrong. Please try again shortly.", {
        status: 500,
        headers: { "content-type": "text/plain; charset=UTF-8" }
    });

}

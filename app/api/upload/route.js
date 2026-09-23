import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = "gigastorage70-web/magento-cds";

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get("file");
    const rawSku = data.get("sku") || "";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine extension
    let ext = path.extname(file.name).toLowerCase();
    if (!ext || ext === ".") {
      if (file.type === "image/png") ext = ".png";
      else if (file.type === "image/webp") ext = ".webp";
      else ext = ".jpg";
    }

    // Determine filename and strip accidental duplicate extensions
    let filename = "";
    let cleanSku = rawSku.trim();
    if (cleanSku) {
      const existingExt = path.extname(cleanSku);
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(existingExt.toLowerCase())) {
        cleanSku = path.basename(cleanSku, existingExt);
      }
      const sanitizedSku = cleanSku.replace(/[\\/*?:"<>|]/g, "_");
      filename = `${sanitizedSku}${ext}`;
    } else {
      const baseName = path.basename(file.name, ext).replace(/[\\/*?:"<>| ]/g, "_");
      filename = `${baseName}${ext}`;
      cleanSku = baseName;
    }

    // 1. If running locally, also save to local public/images folder
    try {
      const imagesDir = path.join(process.cwd(), "public", "images");
      if (fs.existsSync(imagesDir)) {
        fs.writeFileSync(path.join(imagesDir, filename), buffer);
      }
    } catch (e) {
      // Ignore read-only filesystem errors on Vercel
    }

    // 2. Commit directly to GitHub repository via GitHub REST API
    let fileSha = undefined;
    try {
      const checkRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/public/images/${filename}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (checkRes.ok) {
        const existingData = await checkRes.json();
        fileSha = existingData.sha;
      }
    } catch (checkErr) {
      console.warn("Could not check existing file SHA:", checkErr);
    }

    const githubRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/public/images/${filename}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload product image ${filename} via web dashboard`,
          content: buffer.toString("base64"),
          branch: "main",
          ...(fileSha ? { sha: fileSha } : {}),
        }),
      }
    );

    if (!githubRes.ok) {
      const errData = await githubRes.json().catch(() => ({}));
      throw new Error(`GitHub commit failed: ${errData.message || githubRes.statusText}`);
    }

    // Official Vercel Domain URL
    const publicUrl = `https://magento-gold.vercel.app/images/${filename}`;

    return NextResponse.json({
      success: true,
      filename,
      sku: cleanSku,
      size: buffer.length,
      url: `/images/${filename}`,
      cdnUrl: publicUrl,
    });
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}

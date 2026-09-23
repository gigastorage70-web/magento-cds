import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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

    // Determine filename
    let filename = "";
    let cleanSku = rawSku.trim();
    if (cleanSku) {
      const sanitizedSku = cleanSku.replace(/[\\/*?:"<>|]/g, "_");
      filename = `${sanitizedSku}${ext}`;
    } else {
      const baseName = path.basename(file.name, ext).replace(/[\\/*?:"<>| ]/g, "_");
      filename = `${baseName}${ext}`;
      cleanSku = baseName;
    }

    const imagesDir = path.join(process.cwd(), "public", "images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filePath = path.join(imagesDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Update manifest.json
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    let manifest = [];
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch (e) {
        manifest = [];
      }
    }

    // Check if already exists in manifest, update or prepend
    const existingIndex = manifest.findIndex((m) => m.filename === filename || m.sku === cleanSku);
    const newEntry = {
      sku: cleanSku,
      filename: filename,
      url: `/images/${filename}`,
      size: buffer.length,
      res: "Uploaded",
      format: ext.replace(".", "").toUpperCase(),
    };

    if (existingIndex >= 0) {
      manifest[existingIndex] = newEntry;
    } else {
      manifest.unshift(newEntry);
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    const cdnUrl = `https://magento-gold.vercel.app/images/${filename}`;

    return NextResponse.json({
      success: true,
      filename,
      sku: cleanSku,
      size: buffer.length,
      url: `/images/${filename}`,
      cdnUrl: cdnUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}

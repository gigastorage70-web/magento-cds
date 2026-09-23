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

    const isVercel = !!process.env.VERCEL;

    // If running locally, save to public/images and update manifest
    if (!isVercel) {
      try {
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

        return NextResponse.json({
          success: true,
          mode: "local",
          filename,
          sku: cleanSku,
          size: buffer.length,
          url: `/images/${filename}`,
          cdnUrl: `https://magento-gold.vercel.app/images/${filename}`,
        });
      } catch (localErr) {
        console.warn("Local filesystem write failed, falling back to cloud CDN:", localErr);
      }
    }

    // Cloud CDN Upload for Vercel Serverless (Read-only environment)
    const base64Data = buffer.toString("base64");
    const cloudFormData = new FormData();
    cloudFormData.append("key", "6d207e02198a847aa98d0a2a901485a5");
    cloudFormData.append("action", "upload");
    cloudFormData.append("format", "json");
    cloudFormData.append("source", base64Data);

    const cloudRes = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: cloudFormData,
    });

    const cloudJson = await cloudRes.json();
    if (cloudJson && cloudJson.image && cloudJson.image.url) {
      return NextResponse.json({
        success: true,
        mode: "cloud",
        filename,
        sku: cleanSku,
        size: buffer.length,
        url: cloudJson.image.url,
        cdnUrl: cloudJson.image.url,
      });
    }

    throw new Error(cloudJson?.error?.message || "Cloud upload failed");
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}

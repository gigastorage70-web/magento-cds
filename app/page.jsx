"use client";

import { useState, useEffect, useRef } from "react";

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [copiedSku, setCopiedSku] = useState(null);

  // Upload States
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadSku, setUploadSku] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [lastUploaded, setLastUploaded] = useState(null);
  const [copiedLastUrl, setCopiedLastUrl] = useState(false);

  // Git Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const fileInputRef = useRef(null);

  const loadManifest = () => {
    fetch("/manifest.json?t=" + Date.now())
      .then((res) => res.json())
      .then((data) => setImages(data))
      .catch((err) => console.error("Error loading manifest:", err));
  };

  useEffect(() => {
    loadManifest();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
      setUploadError("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
      setUploadError("");
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select or drop an image file first.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setLastUploaded(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadSku.trim()) {
        formData.append("sku", uploadSku.trim());
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      setLastUploaded(data);
      // Reset form fields
      setUploadFile(null);
      setUploadPreview(null);
      setUploadSku("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Reload manifest so the new image appears in the gallery immediately
      loadManifest();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGitSync = async () => {
    setIsSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/git-push", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }
      setSyncMessage(data.message || "Pushed successfully! Vercel is deploying.");
    } catch (err) {
      setSyncMessage("Error syncing: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyUrl = (filename, sku) => {
    const fullUrl = `https://magento-gold.vercel.app/images/${filename}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const copyLastUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedLastUrl(true);
    setTimeout(() => setCopiedLastUrl(false), 2000);
  };

  const filtered = images.filter((img) =>
    img.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalSizeMB = (
    images.reduce((acc, curr) => acc + (curr.size || 0), 0) / (1024 * 1024)
  ).toFixed(2);

  return (
    <div className="container">
      <header>
        <div className="header-top">
          <div>
            <h1>Eaton Catalog Image Server & Gallery</h1>
            <p className="subtitle">
              High-Speed Edge Static Image Hosting for Magento Catalog Import
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn-upload-toggle"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? "✕ Close Upload Panel" : "＋ Upload New Image"}
            </button>
            <div className="badge" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
              Live on Vercel CDN
            </div>
          </div>
        </div>

        {/* Upload Panel */}
        {showUpload && (
          <div className="upload-panel">
            <div className="upload-panel-header">
              <span className="upload-panel-title">Upload Image & Generate Public URL</span>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Auto-names with SKU & generates instant Vercel link
              </span>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="upload-grid">
                {/* Dropzone */}
                <div
                  className="dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                  {uploadPreview ? (
                    <div style={{ textAlign: "center" }}>
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "6px" }}
                      />
                      <div style={{ fontSize: "0.85rem", color: "#38bdf8", marginTop: "0.5rem" }}>
                        {uploadFile?.name} ({Math.round((uploadFile?.size || 0) / 1024)} KB)
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="dropzone-icon">📁</div>
                      <div className="dropzone-text">
                        Drag & Drop image here, or <strong style={{ color: "#38bdf8" }}>browse</strong>
                      </div>
                      <div className="dropzone-sub">Supports JPG, PNG, WEBP</div>
                    </>
                  )}
                </div>

                {/* Form Fields */}
                <div className="upload-fields">
                  <div>
                    <label className="input-label">Product SKU (Optional)</label>
                    <input
                      type="text"
                      className="sku-input"
                      placeholder="e.g. 231W-BOX (Will name image 231W-BOX.jpg)"
                      value={uploadSku}
                      onChange={(e) => setUploadSku(e.target.value)}
                    />
                  </div>

                  {uploadError && (
                    <div style={{ color: "#f87171", fontSize: "0.85rem" }}>
                      ⚠️ {uploadError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-upload-submit"
                    disabled={isUploading || !uploadFile}
                  >
                    {isUploading ? "Uploading..." : "Upload & Generate Public Link"}
                  </button>
                </div>
              </div>
            </form>

            {/* Upload Result Card */}
            {lastUploaded && (
              <div className="upload-result">
                <div style={{ fontWeight: 600, color: "#34d399", fontSize: "0.95rem" }}>
                  ✓ Image Committed to GitHub: <code>public/images/{lastUploaded.filename}</code>
                </div>
                <div className="result-url-box">
                  <input
                    type="text"
                    readOnly
                    className="result-url-input"
                    value={lastUploaded.cdnUrl}
                  />
                  <button
                    className="btn-copy-url"
                    onClick={() => copyLastUrl(lastUploaded.cdnUrl)}
                  >
                    {copiedLastUrl ? "✓ Copied!" : "Copy Magento URL"}
                  </button>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  🔗 <strong>Official Public URL</strong>: <code>{lastUploaded.cdnUrl}</code> — Ready to paste directly into your CSV!
                </div>
              </div>
            )}
          </div>
        )}

        <div className="stats-bar">
          <div className="stat-chip">
            <span className="stat-label">Total Hosted Images</span>
            <span className="stat-value">{images.length}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">Total Storage</span>
            <span className="stat-value">{totalSizeMB} MB</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">Matching Search</span>
            <span className="stat-value">{filtered.length}</span>
          </div>
        </div>

        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search by SKU (e.g. 1107BK, AH1201, 2144...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <main>
        <div className="grid">
          {filtered.map((img) => (
            <div key={img.sku + img.filename} className="card">
              <div className="img-container">
                <img
                  src={img.url}
                  alt={img.sku}
                  className="product-img"
                  loading="lazy"
                />
              </div>
              <div className="card-body">
                <div className="sku-title">{img.sku}</div>
                <div className="meta-row">
                  <span>{img.res || "Standard"}</span>
                  <span>{Math.round(img.size / 1024)} KB</span>
                </div>
                <div className="meta-row">
                  <span className="badge">{img.format}</span>
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", textDecoration: "none", fontSize: "0.8rem" }}
                  >
                    Open ↗
                  </a>
                </div>
                <div className="url-row">
                  <button
                    className="copy-btn"
                    onClick={() => copyUrl(img.filename, img.sku)}
                  >
                    {copiedSku === img.sku ? "✓ Copied URL!" : "Copy Public URL"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

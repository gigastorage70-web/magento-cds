"use client";

import { useState, useEffect } from "react";

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [copiedSku, setCopiedSku] = useState(null);

  useEffect(() => {
    fetch("/manifest.json")
      .then((res) => res.json())
      .then((data) => setImages(data))
      .catch((err) => console.error("Error loading manifest:", err));
  }, []);

  const filtered = images.filter((img) =>
    img.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalSizeMB = (
    images.reduce((acc, curr) => acc + (curr.size || 0), 0) / (1024 * 1024)
  ).toFixed(2);

  const copyUrl = (filename, sku) => {
    const fullUrl = `${window.location.origin}/images/${filename}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

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
          <div className="badge" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
            Ready for Magento Import
          </div>
        </div>

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
            <div key={img.sku} className="card">
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

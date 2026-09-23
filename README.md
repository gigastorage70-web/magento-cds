# Eaton Catalog High-Speed Image Host & Gallery

Edge-hosted high-speed static asset repository and product preview gallery designed for rapid, error-free Magento catalog imports.

## Highlights
- **Edge CDN Speed**: Serves 409 normalized catalog product images via HTTP/2 and HTTP/3 with low latency and unmetered throughput.
- **Direct Image Paths**: Accessible at `/images/{sku}.jpg` (or `.png`).
- **Interactive SKU Explorer**: Built-in interactive frontend at `/` with search, file size metrics, resolution details, and instant "Copy Public URL" buttons.

## Deployment to Vercel

### Option 1: Via GitHub & Vercel Dashboard (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Open [vercel.com](https://vercel.com/new), select **Add New Project**, and import this GitHub repository.
3. Click **Deploy**. Your images will be available at `https://<your-project>.vercel.app/images/{sku}.jpg`.

### Option 2: Via Vercel CLI
Run inside this folder:
```bash
npx vercel
```
Follow the CLI prompts to deploy directly.

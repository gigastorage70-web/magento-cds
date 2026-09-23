import "./globals.css";

export const metadata = {
  title: "Eaton Catalog Image Server & Gallery",
  description: "High-speed static image hosting and preview gallery for Magento catalog import",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

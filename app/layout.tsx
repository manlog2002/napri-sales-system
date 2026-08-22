import type { Metadata } from "next";
import "./globals.css";

const title = "نبري | نظام المبيعات والتوزيع";
const description = "المرحلة الأولى لنظام نبري: قائمة أسعار موحّدة، طلبات، تحصيل، عملاء، مندوبون ومتابعة التنفيذ.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", locale: "ar_EG", images: [{ url: "/og.png", width: 1731, height: 909, alt: "نبري — نظام المبيعات والتوزيع" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

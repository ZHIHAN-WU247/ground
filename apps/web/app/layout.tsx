import type { Metadata } from "next";
import { I18nProvider } from "../components/I18nProvider";
import { SiteChrome } from "../components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "GROUND",
  description: "Unified logistics and C-end shop platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <SiteChrome>{children}</SiteChrome>
        </I18nProvider>
      </body>
    </html>
  );
}

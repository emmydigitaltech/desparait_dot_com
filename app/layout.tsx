import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./despariat.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestrictionBanner from "@/components/RestrictionBanner";
import Splash from "@/components/Splash";
import { BusyProvider, RouteWatcher } from "@/components/BusyProvider";

export const metadata: Metadata = {
  title: "Despariat – Campus Marketplace",
  description: "The student marketplace. Meet on campus. Inspect before you pay.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("dp-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
<body className="dp-body">
  <BusyProvider>
    <Suspense fallback={<div className="dp-header-skeleton" />}>
      <Header />
      <RestrictionBanner />
    </Suspense>
    <main className="dp-main">
      <Suspense fallback={<Splash />}>{children}</Suspense>
    </main>
    <Footer />
    <Suspense fallback={null}>
      <RouteWatcher />
    </Suspense>
  </BusyProvider>
</body>
    </html>
  );
}
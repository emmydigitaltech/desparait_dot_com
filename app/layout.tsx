import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./despariat.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RestrictionBanner from "@/components/RestrictionBanner";

export const metadata: Metadata = {
  title: "Despariat – Campus Marketplace",
  description: "The student marketplace. Meet on campus. Inspect before you pay.",
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
        <Suspense fallback={<div className="dp-header-skeleton" />}>
          <Header />
          <RestrictionBanner />
        </Suspense>
        <main className="dp-main">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
        <Footer />
      </body>
    </html>
  );
}
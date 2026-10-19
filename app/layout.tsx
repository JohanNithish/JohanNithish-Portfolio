import type { Metadata } from "next";
import { JetBrains_Mono, Rubik, Sora } from "next/font/google";
import "./globals.css";

// Sora for display type, Rubik for reading (as on the previous site), JetBrains Mono for the code-flavoured labels
const display = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const body = Rubik({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Johan Nithish G K | Software Developer",
  description: "Full-stack developer and software engineer building high-performance, user-friendly web applications.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the loader's inline script sets --load / data-loaded on <html> before React starts
    // (this element's own attributes only; mismatches anywhere else are still reported)
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="grain min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

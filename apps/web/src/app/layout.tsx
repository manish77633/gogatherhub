import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});
const dmSans = DM_Sans({ variable: "--font-store-body", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-store-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Go Gather Hub | Gifts and Celebrations",
  description: "Thoughtful gifts and decor for every celebration.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSans.variable} ${cormorant.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

import type { MetadataRoute } from "next";

// Home-screen app. Opens at /portal, which sends each person to their own
// portal (student / teacher / admin) or to sign-in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Omnica English",
    short_name: "Omnica",
    description: "Your English lessons, words and homework.",
    id: "/portal",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#6716A4",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

import type { MetadataRoute } from "next";

// מניפסט PWA – מאפשר הוספה למסך הבית, פתיחה במסך מלא, מיתוג ירוק.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "משקי דן - ניהול רכש רפתות",
    short_name: "רכש רפתות",
    description: "מערכת לניהול וצפייה ביתרות רכש לרפתות - משקי דן",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f8f2",
    theme_color: "#1f7a3d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

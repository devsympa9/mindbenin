import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindBenin — Think & Go",
    short_name: "MindBenin",
    description:
      "Passeport, acte de naissance, TVM, factures, CNSS : MindBenin remplit, paie et suit tes démarches au Bénin.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    lang: "fr",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}

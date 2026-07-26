import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "令和新漢語",
    short_name: "令和新漢語",
    description: "横文字を文脈に合う日本語へ。日本語案と使用例を公開で推敲する場。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#0f6b61",
    lang: "ja",
  };
}

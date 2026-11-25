import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import fs from "node:fs";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

const docs = JSON.parse(fs.readFileSync("docs.json", "utf8"));

const slugOf = (p) => (p.endsWith("/index") ? p.slice(0, -"/index".length) : p);

const sidebar = docs.navigation.groups
  .filter((g) => !g.openapi)
  .map((g) => ({
    label: g.group,
    items: g.pages.map((p) => (typeof p === "string" ? slugOf(p) : p)),
  }));

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  site: "https://docs.wazoo.dev",
  integrations: [
    starlight({
      title: docs.name,
      description:
        "Official documentation hub for the Wazoo project ecosystem.",
      // Canonical brand assets from wazootech/brand (brand.wazoo.dev)
      logo: {
        light: "/brand/light.svg",
        dark: "/brand/dark.svg",
        href: "/",
      },
      favicon: "/favicon.svg",
      social: [
        {
          label: "GitHub",
          icon: "github",
          href: "https://github.com/wazootech",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      sidebar: [...sidebar, ...openAPISidebarGroups],
      plugins: [
        starlightOpenAPI([
          {
            base: "api/platform",
            label: "Platform API",
            schema: "openapi-platform.json",
          },
          {
            base: "api/worlds",
            label: "Worlds API",
            schema: "openapi-worlds.json",
          },
        ]),
      ],
    }),
  ],
});

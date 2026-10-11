// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// Published to https://fulgidus.github.io/wombo-combo/ (GitHub Pages project site).
export default defineConfig({
  site: "https://fulgidus.github.io",
  base: "/wombo-combo",
  integrations: [
    starlight({
      title: "wombo-combo",
      description:
        "AI agent orchestration for parallel feature development: tasks, quests, a daemon and a TUI.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/fulgidus/wombo-combo",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/fulgidus/wombo-combo/edit/main/docs/",
      },
      sidebar: [
        { label: "Getting started", items: [{ autogenerate: { directory: "getting-started" } }] },
        { label: "Guides", items: [{ autogenerate: { directory: "guides" } }] },
        { label: "Architecture", items: [{ autogenerate: { directory: "architecture" } }] },
        { label: "Reference", items: [{ autogenerate: { directory: "reference" } }] },
      ],
    }),
  ],
});

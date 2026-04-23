import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import * as child_process from "node:child_process";

child_process.execSync("bun tools/build_catalog.ts", { stdio: "inherit" });
child_process.execSync("bun build src/lib/component/radio86-emulator.ts --outfile static/radio86-emulator.js --minify", { stdio: "inherit" });

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter({ strict: false }),
        prerender: {
            entries: ["*", "/", "/catalog"],
            handleHttpError: "warn",
        },
        paths: { base: process.env.BASE_PATH || "" },
        output: { bundleStrategy: "inline" },
        version: {
            name: child_process.execSync("git rev-parse --short HEAD").toString().trim(),
        },
    },
};

export default config;

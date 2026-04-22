import { cpSync, existsSync, mkdirSync } from "node:fs";
import { build, context } from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/index.ts"],
  outfile: "dist/w.js",
  bundle: true,
  format: "iife",
  globalName: "CcmFeedback",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  sourcemap: true,
  legalComments: "none",
  banner: {
    js: "/*! CCM Feedback MVP — https://github.com/ccmdesign/ccm-feedback-tool */",
  },
  logLevel: "info",
};

function mirrorToPublic() {
  if (!existsSync("public")) mkdirSync("public", { recursive: true });
  cpSync("dist/w.js", "public/w.js");
}

if (watch) {
  const ctx = await context({
    ...options,
    minify: false,
    plugins: [
      {
        name: "mirror-to-public",
        setup(b) {
          b.onEnd((result) => {
            if (!result.errors.length) mirrorToPublic();
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log("[ccm-feedback] watching — writes to dist/w.js and public/w.js");
} else {
  await build(options);
  mirrorToPublic();
  console.log("[ccm-feedback] wrote dist/w.js + public/w.js");
}

// Genera dist/: CSS de Tailwind compilado e incrustado, iconos como SVG en
// línea, fuentes alojadas en el propio sitio y caché del service worker
// versionada. Uso: npm run build
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const nm = join(root, "node_modules");

rmSync(dist, { recursive: true, force: true });
cpSync(join(root, "public"), dist, { recursive: true });

// fuentes
mkdirSync(join(dist, "fonts"), { recursive: true });
for (const w of [400, 500, 700]) {
  cpSync(
    join(nm, `@fontsource/roboto/files/roboto-latin-${w}-normal.woff2`),
    join(dist, `fonts/roboto-${w}.woff2`),
  );
}
cpSync(
  join(nm, "@fontsource/pirata-one/files/pirata-one-latin-400-normal.woff2"),
  join(dist, "fonts/pirata-one-400.woff2"),
);

// Tailwind
const cssFile = join(dist, "app.tmp.css");
execFileSync(
  join(nm, ".bin/tailwindcss"),
  ["-c", join(root, "tailwind.config.js"), "-i", join(root, "src/app.css"), "-o", cssFile, "--minify"],
  { cwd: root, stdio: ["ignore", "ignore", "inherit"] },
);
const css = readFileSync(cssFile, "utf8");
rmSync(cssFile);

// iconos Material Symbols -> SVG en línea (sin descargar la fuente de iconos)
const ICON_ALIASES = { expand_more: "keyboard_arrow_down" };
const svgCache = {};
function iconSvg(name) {
  if (!svgCache[name]) {
    const file = join(nm, "@material-symbols/svg-400/outlined", `${ICON_ALIASES[name] || name}.svg`);
    svgCache[name] = readFileSync(file, "utf8")
      .trim()
      .replace(/ width="48" height="48"/, ' aria-hidden="true"');
  }
  return svgCache[name];
}

let html = readFileSync(join(dist, "index.html"), "utf8");
let iconCount = 0;
html = html.replace(
  /(<(span|button|div)\b[^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>)\s*([a-z_]+)\s*(<\/\2\s*>)/g,
  (_, open, _tag, name, close) => {
    iconCount++;
    return `${open}${iconSvg(name)}${close}`;
  },
);
if (html.includes("<!--BUILD_CSS-->") === false) throw new Error("falta <!--BUILD_CSS-->");
html = html.replace("<!--BUILD_CSS-->", `<style>${css}</style>`);
writeFileSync(join(dist, "index.html"), html);

// versión de la caché del service worker = hash del contenido
const buildId = createHash("sha1").update(html).digest("hex").slice(0, 10);
const swPath = join(dist, "sw.js");
writeFileSync(swPath, readFileSync(swPath, "utf8").replace("__BUILD_ID__", buildId));

console.log(`dist/ listo · ${iconCount} iconos · CSS ${(css.length / 1024).toFixed(1)} KB · build ${buildId}`);

// Omnica English — Story / highlight-cover renderer.
//
//   node assets/marketing/templates/story/render.cjs <content-folder>
//
// Reads <content-folder>/stories.json and writes 1080×1920 PNGs to
// <content-folder>/stories/ and 1080×1080 covers to <content-folder>/covers/.
// Colors and fonts come from brand/brand.md. Run from the repository root
// (uses the repo's Playwright/Chromium and lucide-react icons).
// In Claude cloud sessions prefix with NODE_USE_ENV_PROXY=1 so Google Fonts load.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../../../..");
const MARKETING = path.resolve(__dirname, "../..");
const C = { purple: "#6716A4", yellow: "#FFCA00", cream: "#FFF9ED", ink: "#33253C", lavender: "#EBDDF3", deep: "#391052", white: "#FFFFFF" };
const THEMES = {
  purple: { bg: C.purple, title: C.white, accent: C.yellow, body: "rgba(255,255,255,.88)", logo: "lockup-dark.svg", line: C.yellow },
  cream: { bg: C.cream, title: C.purple, accent: C.purple, body: C.ink, logo: "lockup-light.svg", line: C.yellow },
  yellow: { bg: C.yellow, title: C.purple, accent: C.purple, body: C.ink, logo: "lockup-light.svg", line: C.purple },
};

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const logo = name => dataUri(path.join(ROOT, "public/brand/tenant", name), "image/svg+xml");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function icon(name, color, size, stroke = 1.6) {
  const src = fs.readFileSync(path.join(ROOT, "node_modules/lucide-react/dist/esm/icons", `${name}.js`), "utf8");
  const node = src.slice(src.indexOf("const __iconNode"), src.indexOf("];", src.indexOf("const __iconNode")) + 2);
  const parts = [...node.matchAll(/\[\s*"(\w+)",\s*\{([^}]*)\}/g)].map(([, tag, attrs]) => {
    const a = [...attrs.matchAll(/(\w+):\s*"([^"]*)"/g)].filter(([, k]) => k !== "key").map(([, k, v]) => `${k}="${v}"`).join(" ");
    return `<${tag} ${a}/>`;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${parts.join("")}</svg>`;
}

function visual(v, t, dir) {
  if (!v) return "";
  if (v.type === "screenshot") {
    const file = path.join(MARKETING, v.src);
    const [y0, y1] = v.crop; // CSS px of the 390-wide capture
    const w = v.width ?? 880, scale = w / 390;
    return `<div class="shot" style="width:${w}px;height:${(y1 - y0) * scale}px"><img src="${dataUri(file, "image/jpeg")}" style="width:${w}px;transform:translateY(${-y0 * scale}px)"/></div>`;
  }
  if (v.type === "mark") return `<img class="mark" src="${logo("logo.svg")}"/>`;
  if (v.type === "steps") return `<div class="steps">${v.items.map(([ic, text], i) => `
      <div class="step"><div class="stepIcon">${icon(ic, C.purple, 64, 2)}</div><div class="stepText">${esc(text)}</div></div>${i < v.items.length - 1 ? `<div class="stepLine"></div>` : ""}`).join("")}</div>`;
  if (v.type === "chat") return `<div class="chat">${v.items.map(([who, text], i) => `<div class="bubble b${i}"><div class="who">${esc(who)}</div>“${esc(text)}”</div>`).join("")}</div>`;
  if (v.type === "panels") return `<div class="panels">${v.items.map(([head, text]) => `<div class="panel"><div class="ph">${esc(head)}</div><div class="pt">${esc(text)}</div></div>`).join("")}</div>`;
  if (v.type === "icon") return `<div class="bigIcon" style="background:${v.circle ?? C.yellow}">${icon(v.name, v.color ?? C.purple, 300, 1.4)}</div>`;
  if (v.type === "link") return `<div class="link">${icon("arrow-down", t.line, 150, 1.6)}</div>`;
  return "";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=PT+Serif:ital,wght@1,400;1,700&display=block');
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:Inter,sans-serif;position:relative;-webkit-font-smoothing:antialiased}
.logo{position:absolute;left:90px;top:230px;height:84px}
.wrap{position:absolute;left:90px;right:90px;top:400px;bottom:270px;display:flex;flex-direction:column}
h1{font-weight:800;font-size:92px;line-height:1.04;letter-spacing:-.025em}
.accent{font-family:'PT Serif',serif;font-style:italic;font-weight:400;font-size:88px;line-height:1.1;letter-spacing:-.01em;margin-top:6px}
.body{font-weight:500;font-size:44px;line-height:1.3;margin-top:36px}
.vis{flex:1;display:flex;align-items:center;justify-content:center;margin-top:50px;min-height:0}
.shot{border-radius:40px;overflow:hidden;box-shadow:0 30px 80px rgba(57,16,82,.28),0 0 0 3px rgba(57,16,82,.08);background:#fff;flex:none}
.shot img{display:block}
.mark{width:420px;height:420px}
.steps{display:flex;flex-direction:column;width:100%}
.step{display:flex;align-items:center;gap:40px}
.stepIcon{width:130px;height:130px;border-radius:50%;background:${C.yellow};display:flex;align-items:center;justify-content:center;flex:none}
.stepText{font-size:50px;font-weight:700;color:${C.ink};line-height:1.15}
.stepLine{width:6px;height:60px;background:${C.yellow};margin-left:62px;border-radius:3px}
.chat{width:100%;display:flex;flex-direction:column;gap:40px}
.bubble{font-size:52px;font-weight:600;padding:34px 44px 40px;border-radius:44px;max-width:780px;line-height:1.2;color:${C.ink}}
.bubble .who{font-size:28px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.purple};margin-bottom:12px}
.b0{background:${C.lavender};align-self:flex-start;border-bottom-left-radius:12px;transform:rotate(-2deg)}
.b1{background:${C.yellow};align-self:flex-end;border-bottom-right-radius:12px;transform:rotate(1.5deg)}
.panels{width:100%;display:flex;flex-direction:column;gap:36px}
.panel{background:#fff;border-radius:40px;padding:44px 48px;box-shadow:0 20px 50px rgba(57,16,82,.12);border-left:16px solid ${C.yellow}}
.ph{font-size:52px;font-weight:800;color:${C.purple};line-height:1.1}
.pt{font-size:42px;font-weight:500;color:${C.ink};margin-top:14px;line-height:1.28}
.bigIcon{width:520px;height:520px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.link{width:100%;height:100%;display:flex;align-items:flex-start;justify-content:center;padding-top:20px}
.wave{position:absolute;left:-20px;right:-20px}
.site{position:absolute;left:90px;bottom:250px;font-size:30px;font-weight:600;opacity:.7}
`;

function storyHtml(s) {
  const t = THEMES[s.bg];
  const wave = s.wave === false ? "" : `<svg class="wave" style="top:${s.waveY ?? 330}px" width="1120" height="60" viewBox="0 0 1120 60"><path d="M0 40 C 200 0, 360 0, 560 30 S 920 60, 1120 10" stroke="${t.line}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/></svg>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
  <body style="background:${t.bg}">
    <img class="logo" src="${logo(t.logo)}"/>
    ${s.wave ? wave : ""}
    <div class="wrap">
      <h1 style="color:${t.title}">${s.title.map(esc).join("<br>")}</h1>
      ${s.accent ? `<div class="accent" style="color:${t.accent}">${s.accent.map(esc).join("<br>")}</div>` : ""}
      ${s.body ? `<div class="body" style="color:${t.body}">${s.body.map(esc).join("<br>")}</div>` : ""}
      <div class="vis">${visual(s.visual, t)}</div>
    </div>
    ${s.site === false ? "" : `<div class="site" style="color:${t.title}">omnicaenglish.com</div>`}
  </body></html>`;
}

function coverHtml(c) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0}body{width:1080px;height:1080px;background:${C.purple};display:flex;align-items:center;justify-content:center}</style></head>
  <body>${icon(c.icon, C.yellow, 460, 1.5)}</body></html>`;
}

(async () => {
  const dir = path.resolve(process.argv[2] || ".");
  const spec = JSON.parse(fs.readFileSync(path.join(dir, "stories.json"), "utf8"));
  const only = process.argv[3];
  fs.mkdirSync(path.join(dir, "stories"), { recursive: true });
  fs.mkdirSync(path.join(dir, "covers"), { recursive: true });
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost" } : undefined;
  const browser = await chromium.launch({ proxy });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const h of spec.highlights) {
    for (const s of h.stories) {
      if (only && !s.id.startsWith(only)) continue;
      await page.setViewportSize({ width: 1080, height: 1920 });
      await page.setContent(storyHtml(s), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const out = path.join(dir, "stories", `${s.id}.png`);
      await page.screenshot({ path: out });
      console.log("story", path.relative(ROOT, out));
    }
    if (only) continue;
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(coverHtml(h), { waitUntil: "load" });
    await page.screenshot({ path: path.join(dir, "covers", `${h.slug}.png`) });
  }
  await browser.close();
})();

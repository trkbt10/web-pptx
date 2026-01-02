import { readPptxFile } from "./reader";
import { buildSlideRenderContext } from "./integration/slide-render";

async function main() {
  const pptx = await readPptxFile("fixtures/poi-test-data/test-data/slideshow/themes.pptx");
  const ctx = await buildSlideRenderContext(pptx, 3);
  
  console.log("=== Theme bgFillStyleLst count ===");
  console.log("Count:", ctx.presentation.theme.formatScheme.bgFillStyles.length);
  
  if (ctx.presentation.theme.formatScheme.bgFillStyles.length > 2) {
    const bgStyle = ctx.presentation.theme.formatScheme.bgFillStyles[2];
    console.log("\n=== bgFillStyleLst[2] (idx=1003) ===");
    console.log("Name:", bgStyle.name);
    console.log("Attrs:", JSON.stringify(bgStyle.attrs, null, 2));
    console.log("Children count:", bgStyle.children.length);
    for (const child of bgStyle.children) {
      if (typeof child === "object" && "name" in child) {
        console.log("  Child:", (child as any).name, "attrs:", JSON.stringify((child as any).attrs));
      }
    }
  }
}

main().catch(console.error);

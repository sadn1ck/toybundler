import { cleanImportExport } from "./hooks/post";
import { removeDuplicateDeclarations } from "./hooks/pre";
import { toybundle } from "./manager";

const bundles = [
  "./__fixtures__/cyclic-imports/index.js",
  "./__fixtures__/basic-esm/index.js",
];

(async () => {
  for (const entry of bundles) {
    try {
      await toybundle({ entry })
        .parse()
        .preTransform(removeDuplicateDeclarations)
        .bundle()
        .postTransform(cleanImportExport)
        .run();
    } catch (e: any) {
      console.error(e?.message ?? e);
    }
  }
})();

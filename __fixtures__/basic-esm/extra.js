import defaultExport from "./default.js";

export const EXTRA_CONSTANT = () => {
  console.log("[extra.js] EXTRA_CONSTANT called", EXTRA_CONSTANT);
  defaultExport(EXTRA_CONSTANT);
};

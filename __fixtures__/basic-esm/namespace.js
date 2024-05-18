import { util } from "./util.js";

export const test1 = () => {
  console.log("[namespace.js] test1 called");
};

export const test2 = () => {
  console.log("[namespace.js] test2 called");
};

export const test3 = () => {
  console.log("[namespace.js] test3 called");
};

export function testWithUtil(...args) {
  console.log("[namespace.js] testWithUtil called", args);
  util(...args);
}

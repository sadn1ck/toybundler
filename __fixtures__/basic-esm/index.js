// entry point
import { A, fn, fullFn } from "./multiple-exports.js";
import * as namespace from "./namespace.js";
import "./sideeffect.js";
import { util } from "./util.js";

function main() {
  fn();
  fullFn();
  console.log(new A());
  util();
  namespace.test1();
  namespace.test2();
  namespace.test3();
  namespace.testWithUtil(1, 2, 3);
}

main();

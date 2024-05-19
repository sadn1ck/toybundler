// entry point
import { A, fn, fullFn } from "./multiple-exports.js";
import "./sideeffect.js";
import { util } from "./util.js";

function main() {
  fn();
  fullFn();
  console.log(new A());
  util();
}

main();

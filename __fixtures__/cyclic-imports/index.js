import { dep1 } from "./dep1.js";
import dep2 from "./dep2.js";

function main() {
  dep2();
  dep1();
}

main();

import { dep1 } from "./dep1.js";

export default function dep2() {
  console.log("[dep2.js] dep2 called");
  dep1();
}

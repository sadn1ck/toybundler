import dep2 from "./dep2.js";

const dep1 = () => {
  console.log("[dep1.js] dep1 called");
  dep2();
};

export { dep1 };

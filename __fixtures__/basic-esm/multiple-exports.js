import { EXTRA_CONSTANT } from "./extra.js";

class A {
  constructor() {
    console.log("[multiple-exports] A called");
  }
}

const fn = () => {
  console.log("[multiple-exports] fn called");
};

function fullFn() {
  console.log("[multiple-exports] fullFn called");
}

export { A, EXTRA_CONSTANT, fn, fullFn };

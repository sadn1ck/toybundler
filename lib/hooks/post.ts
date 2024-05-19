import generate from "@babel/generator";
import traverse from "@babel/traverse";
import t from "@babel/types";
import type { PostTransformHook } from "../types";

export const cleanImportExport: PostTransformHook = (code, ast) => {
  traverse(ast, {
    ImportDeclaration: (path) => {
      path.remove();
    },
    ExportDefaultDeclaration: (path) => {
      path.remove();
    },
    ExportNamedDeclaration: (path) => {
      if (t.isVariableDeclaration(path.node.declaration)) {
        if (path.node.declaration.kind === "const") {
          path.replaceWith(path.node.declaration);
        }
      } else if (t.isFunctionDeclaration(path.node.declaration)) {
        path.replaceWith(path.node.declaration);
      } else {
        path.remove();
      }
    },
  });
  return {
    code: generate(ast).code,
    ast,
  };
};

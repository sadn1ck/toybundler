import generate from "@babel/generator";
import traverse from "@babel/traverse";
import t from "@babel/types";
import type { PreTransformHook } from "../types";

export const removeDuplicateDeclarations: PreTransformHook = ({
  mods,
  ...rest
}) => {
  const decls = new Map<string, [number, string]>();
  for (const [moduleId, module] of mods.entries()) {
    const prog = module.mod;
    traverse(prog, {
      VariableDeclaration: (path) => {
        path.node.declarations.forEach((decl) => {
          const ident = decl.id.loc?.identifierName;
          if (!ident) return;

          if (!decls.has(ident)) {
            decls.set(ident, [1, moduleId]);
          } else {
            const [count, declModulePath] = decls.get(ident)!;
            // console.log("possible duplicate", modulePath, ident);
            if (moduleId !== declModulePath) {
              const newName = `${ident}$${count}`;
              path.scope.rename(ident, newName);
              decls.set(newName, [1, moduleId]);
            }
          }
        });
      },
      FunctionDeclaration: (path) => {
        const ident = path.node.id!.loc!.identifierName;
        if (!ident) return;

        if (!decls.has(ident)) {
          decls.set(ident, [1, moduleId]);
        } else {
          const [count, declModulePath] = decls.get(ident)!;
          // console.log("possible duplicate", modulePath, ident);
          if (moduleId !== declModulePath) {
            const newName = `${ident}$${count}`;
            path.scope.rename(ident, newName);
            decls.set(newName, [1, moduleId]);
          }
        }
      },
    });
    module.mod = prog;
    mods.set(moduleId, module);
  }

  return {
    mods,
    ...rest,
  };
};

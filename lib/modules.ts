import { parse, traverse } from "@babel/core";
import t from "@babel/types";
import { dirname, join } from "node:path";
import type {
  DependencyGraph,
  ModuleGraph,
  ModuleInfo,
  ParseModuleFn,
} from "./types";

// util to get module info via acorn + reading fs
async function getModuleInfo(modulePath: string): Promise<ModuleInfo> {
  let rawCode = await Bun.file(modulePath).text();
  const prog = parse(rawCode, {
    sourceType: "module",
  });

  if (!prog) {
    throw new Error(`Failed to parse module at ${modulePath}`);
  }

  const imports = new Set<string>();

  traverse(prog, {
    ImportDeclaration: (path) => {
      const importPath = join(
        dirname(modulePath),
        path.node.source.value as string
      );
      if (!imports.has(importPath)) {
        // TODO: only if relative import
        // as we dont support normal deps right now
        imports.add(importPath);
        // importRanges.push([node.start!, node.end!]);
      }
      path.remove();
    },
    // ExportDefaultDeclaration: (path) => {
    //   path.remove();
    // },
    // ExportNamedDeclaration: (path) => {
    //   if (t.isVariableDeclaration(path.node.declaration)) {
    //     if (path.node.declaration.kind === "const") {
    //       path.replaceWith(path.node.declaration);
    //     }
    //   } else if (t.isFunctionDeclaration(path.node.declaration)) {
    //     path.replaceWith(path.node.declaration);
    //   } else {
    //     path.remove();
    //   }
    // },
  });

  return {
    rawCode,
    imports: Array.from(imports),
    mod: prog,
  };
}

// generates mappings of file to its imports
export const parseModules: ParseModuleFn = async ({ entry }) => {
  const mods: ModuleGraph = new Map();
  const deps: DependencyGraph = new Map();
  const seenModules = new Set<string>();

  const paths: string[] = [entry];
  for (let i = 0; i < paths.length; i++) {
    const currentPath = paths[i];
    const { imports, rawCode, mod } = await getModuleInfo(currentPath);

    mods.set(currentPath, {
      rawCode: rawCode,
      path: currentPath,
      mod,
      entry: i === 0,
    });

    if (imports.length !== 0) {
      const withoutSeen = imports.filter((path) => !seenModules.has(path));
      paths.push(...withoutSeen);
      seenModules.add(currentPath);
    }

    const existingImports = deps.get(currentPath);
    if (existingImports) {
      deps.set(
        currentPath,
        Array.from(new Set([...existingImports, ...imports]))
      );
    } else {
      deps.set(currentPath, imports);
    }
  }
  return {
    deps: deps,
    hasCycle: detectCycles(deps) ?? false,
    mods: mods,
  };
};

// detects circular dependencies between files
function detectCycles(deps: Map<string, string[]>) {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  for (const node of deps.keys()) {
    if (!visited.has(node)) {
      if (dfs(node, deps)) {
        return true;
      }
    }
    return false;
  }

  function dfs(node: string, graph: Map<string, string[]>) {
    visited.add(node);
    visiting.add(node);

    for (const neighbour of graph.get(node) || []) {
      if (!visited.has(neighbour)) {
        if (dfs(neighbour, graph)) {
          return true;
        }
      } else if (visiting.has(neighbour)) {
        return true;
      }
    }
    visiting.delete(node);
    return false;
  }
}

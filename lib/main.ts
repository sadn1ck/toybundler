import { parse } from "@babel/core";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import t from "@babel/types";
import { basename, dirname, join } from "node:path";

type Module = {
  rawCode: string;
  path: string;
  mod: NonNullable<ReturnType<typeof parse>>;
  entry: boolean;
};

type BundlerOptions = {
  entry: string;
};

// entry
const bundles = [
  () => bundle({ entry: "./__fixtures__/cyclic-imports/index.js" }),
  () => bundle({ entry: "./__fixtures__/basic-esm/index.js" }),
];

bundles.forEach(async (fn) => {
  const now = performance.now();
  await fn();
  console.log(`Time taken: ${performance.now() - now}ms`);
});

/**
 * top level bundle fn
 */
async function bundle({ entry }: BundlerOptions) {
  const result = await generateModuleGraph({
    entry,
  });

  const code = await bundleFiles(result);
  const outpath = join(dirname(entry), basename(dirname(entry)) + ".out.js");
  await Bun.write(outpath, code);
}

async function bundleFiles({
  dependencyGraph,
  hasCycles,
  modules,
}: {
  dependencyGraph: Map<string, string[]>;
  hasCycles: boolean | undefined;
  modules: Map<string, Module>;
}): Promise<string> {
  let code = "";

  if (hasCycles) {
    console.log("Cycles detected while bundling");
    return "// Cycles detected while bundling";
    // throw new Error("Cycles detected while bundling");
  }
  const sortedModules = topologicalSort(dependencyGraph);
  sortedModules.forEach((moduleId) => {
    const module = modules.get(moduleId);
    if (!module) {
      throw new Error("WTF ded, module not found" + moduleId);
    }

    code += generate(module.mod).code + "\n";
  });

  return code;
}

function topologicalSort(dependencyGraph: Map<string, string[]>): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();

  function visit(moduleId: string) {
    if (visited.has(moduleId)) return;
    visited.add(moduleId);

    const dependencies = dependencyGraph.get(moduleId) || [];
    dependencies.forEach(visit);
    sorted.push(moduleId);
  }

  dependencyGraph.forEach((_, moduleId) => {
    visit(moduleId);
  });

  return sorted;
}

// util to get module info via acorn + reading fs
async function getModuleInfo(modulePath: string) {
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
    rawCode,
    imports: Array.from(imports),
    mod: prog,
  };
}

// generates mappings of file to its imports
async function generateModuleGraph({ entry }: { entry: string }) {
  const mods = new Map<string, Module>();
  const deps = new Map<string, string[]>();
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
    dependencyGraph: deps,
    hasCycles: detectCycles(deps),
    modules: mods,
  };
}

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

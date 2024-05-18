import { parse, type Program } from "acorn";
import { simple } from "acorn-walk";
import { dirname, join } from "path";
let ID = 0;

type Module = {
  id: string;
  rawCode: string;
  path: string;
  pathHash?: string;
  acorn: Program;
};

type BundlerOptions = {
  entry: string;
};

// entry
const bundles = [
  () => bundle({ entry: "./__fixtures__/basic-esm/index.js" }),
  () => bundle({ entry: "./__fixtures__/cyclic-imports/index.js" }),
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
  const { dependencyGraph, hasCycles, modules } = await generateModuleGraph({
    entry,
  });
  console.log({
    hasCycles,
    modules,
  });
}
// module cache to store when the module is already parsed

// util to get module info via acorn + reading fs
async function getModuleInfo(path: string) {
  const id = ID++;
  const rawCode = await Bun.file(path).text();
  const prog = parse(rawCode, {
    ecmaVersion: "latest",
    sourceType: "module",
  });

  const imports = new Set<string>();

  simple(prog, {
    ImportDeclaration(node) {
      imports.add(join(dirname(path), node.source.value as string));
    },
  });

  return {
    rawCode,
    id,
    imports: Array.from(imports),
    prog,
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
    const { imports, id, rawCode, prog } = await getModuleInfo(currentPath);

    mods.set(currentPath, {
      id: `${id}`,
      rawCode: rawCode,
      path: currentPath,
      acorn: prog,
    });

    if (imports.length !== 0) {
      const withoutSeen = imports.filter((i) => !seenModules.has(i));
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

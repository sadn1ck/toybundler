import generate from "@babel/generator";
import t from "@babel/types";
import type { BundleFileInput } from "./types";

export async function bundleFiles({
  deps,
  hasCycle,
  mods,
}: BundleFileInput): Promise<
  | {
      code: string | null;
      ast: t.File;
    }
  | {
      error: string;
    }
> {
  let code = "";

  if (hasCycle) {
    return {
      error: "Cycle detected while bundling",
    };
  }
  const sortedModules = topologicalSort(deps);
  const combinedAst = t.program([], [], "module");
  const file = t.file(combinedAst);
  sortedModules.forEach((moduleId) => {
    const module = mods.get(moduleId);
    if (!module) {
      throw new Error("WTF ded, module not found" + moduleId);
    }
    file.program.body.push(...module.mod.program.body);
  });

  code = generate(file).code;
  return { code, ast: file };
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

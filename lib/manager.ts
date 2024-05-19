import { basename, dirname, join } from "node:path";
import { bundleFiles } from "./bundle";
import { parseModules } from "./modules";
import type {
  BundleFileInput,
  BundlerOptions,
  PostTransformHook,
  PreTransformHook,
} from "./types";
import t from "@babel/types";

// TODO: fix types to only show which can be sequenced
export function toybundle({ entry }: BundlerOptions) {
  const tasks: Array<[name: string, () => Promise<any>]> = [];
  let preBundleData: BundleFileInput | null = null;
  let postBundleAst: t.File | null = null;
  let postBundleCode: string | null = null;
  function addTask(name: string, task: () => Promise<any>) {
    tasks.push([name, task]);
  }
  return {
    parse() {
      addTask("parse", async () => {
        const result = await parseModules({ entry });
        preBundleData = result;
      });
      return this;
    },
    preTransform(fn: PreTransformHook = () => preBundleData) {
      addTask("preTransform", async () => {
        if (!preBundleData) {
          throw new Error("parse() must be called first");
        }
        const result = fn(preBundleData);
        preBundleData = result;
      });
      return this;
    },
    bundle() {
      addTask("bundle", async () => {
        if (!preBundleData) {
          throw new Error("preTransform() must be called first");
        }
        const result = await bundleFiles(preBundleData);
        if ("error" in result) {
          throw new Error("Failed to bundle, cause: " + result["error"]);
        }
        const { code, ast } = result;
        postBundleCode = code;
        postBundleAst = ast;
      });
      return this;
    },
    postTransform(
      fn: PostTransformHook = () => ({
        code: postBundleCode,
        ast: postBundleAst,
      })
    ) {
      addTask("postTransform", async () => {
        if (!postBundleCode || !postBundleAst) {
          throw new Error("bundle() must be called first");
        }
        const result = fn(postBundleCode, postBundleAst);
        postBundleAst = result.ast;
        postBundleCode = result.code;
      });
      return this;
    },
    async run() {
      addTask("run", async () => {
        if (!postBundleCode) {
          throw new Error("bundle() must be called first");
        }
        const outpath = join(
          dirname(entry),
          basename(dirname(entry)) + ".out.js"
        );
        await Bun.write(outpath, postBundleCode);
      });
      const loc = dirname(entry).split("/").at(-1);
      for (const [name, task] of tasks) {
        const now = performance.now();
        await task();
        console.log(
          `[${loc}]: ${name} took ${(performance.now() - now).toFixed(5)}ms`
        );
      }
    },
  };
}

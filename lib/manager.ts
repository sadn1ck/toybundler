import t from "@babel/types";
import { basename, dirname, join } from "node:path";
import { bundleFiles } from "./bundle";
import { parseModules } from "./modules";
import type {
  BundleFileInput,
  BundlerOptions,
  PostTransformHook,
  PreTransformHook,
} from "./types";

export function toybundle({ entry }: BundlerOptions) {
  return {
    parse() {
      return new ToyBundle({ entry }).parse();
    },
  };
}

class ToyBundle {
  private tasks: Array<[name: string, () => Promise<any>]> = [];
  private preBundleData: BundleFileInput | null = null;
  private postBundleAst: t.File | null = null;
  private postBundleCode: string | null = null;
  private entry: string;

  constructor({ entry }: BundlerOptions) {
    this.entry = entry;
  }

  private addTask(name: string, task: () => Promise<any>) {
    this.tasks.push([name, task]);
  }

  parse = () => {
    this.addTask("parse", async () => {
      const result = await parseModules({ entry: this.entry });
      this.preBundleData = result;
    });
    return {
      preTransform: this.preTransform,
      bundle: this.bundle,
    };
  };

  preTransform = (fn: PreTransformHook = () => this.preBundleData) => {
    this.addTask("preTransform", async () => {
      if (!this.preBundleData) {
        throw new Error("parse() must be called first");
      }
      const result = fn(this.preBundleData);
      this.preBundleData = result;
    });
    return {
      bundle: this.bundle,
    };
  };

  bundle = () => {
    this.addTask("bundle", async () => {
      if (!this.preBundleData) {
        throw new Error("preTransform() must be called first");
      }
      const result = await bundleFiles(this.preBundleData);
      if ("error" in result) {
        throw new Error("Failed to bundle, cause: " + result["error"]);
      }
      const { code, ast } = result;
      this.postBundleCode = code;
      this.postBundleAst = ast;
    });
    return {
      postTransform: this.postTransform,
      run: this.run,
    };
  };

  postTransform = (
    fn: PostTransformHook = () => ({
      code: this.postBundleCode,
      ast: this.postBundleAst,
    })
  ) => {
    this.addTask("postTransform", async () => {
      if (!this.postBundleCode || !this.postBundleAst) {
        throw new Error("bundle() must be called first");
      }
      const result = fn(this.postBundleCode, this.postBundleAst);
      this.postBundleAst = result.ast;
      this.postBundleCode = result.code;
    });
    return {
      run: this.run,
    };
  };

  run = async () => {
    this.addTask("run", async () => {
      if (!this.postBundleCode) {
        throw new Error("bundle() must be called first");
      }
      const outpath = join(
        dirname(this.entry),
        basename(dirname(this.entry)) + ".out.js"
      );
      await Bun.write(outpath, this.postBundleCode);
    });
    const loc = dirname(this.entry).split("/").at(-1);
    for (const [name, task] of this.tasks) {
      const now = performance.now();
      await task();
      console.log(
        `[${loc}]: ${name} took ${(performance.now() - now).toFixed(5)}ms`
      );
    }
  };
}

import type { parse } from "@babel/core";
import type t from "@babel/types";

type Module = {
  rawCode: string;
  path: string;
  mod: NonNullable<ReturnType<typeof parse>>;
  entry: boolean;
};

type DependencyGraph = Map<string, string[]>;
type ModuleGraph = Map<string, Module>;

type BundlerOptions = {
  entry: string;
};

type ModuleInfo = {
  rawCode: string;
  imports: string[];
  mod: NonNullable<ReturnType<typeof parse>>;
};

type BundleFileInput = {
  deps: DependencyGraph;
  mods: ModuleGraph;
  hasCycle: boolean;
};

type ParseModuleFn = ({ entry }: { entry: string }) => Promise<BundleFileInput>;

type PostTransformHook = (
  code: string,
  ast: t.File
) => {
  code: string | null;
  ast: t.File | null;
};

type PreTransformHook = (props: BundleFileInput) => BundleFileInput | null;

export type {
  BundleFileInput,
  BundlerOptions,
  DependencyGraph,
  Module,
  ModuleGraph,
  ModuleInfo,
  ParseModuleFn,
  PostTransformHook,
  PreTransformHook,
};

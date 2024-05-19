# toybundler

## what is this

This is a toy javascript bundler written in typescript + bun as a learning project to know the inner workings of an actual bundler. This currently only supports ESM, and bails if any cyclic imports are found.

I don't even know if it'd work for more complex bundles, but will slowly get there (_maaaaayybe_).

## video

https://github.com/sadn1ck/toybundler/assets/16396161/7070bcdd-f6f8-4a50-b608-13f41b0b9c1d

## working

At a high level, it does the following things:

- reads files and converts them into AST using babel
- traverses the AST and finds all imports
- tracks imports and generates a module dependency map
- recursively finds modules and generates a module graph
- finds any duplicate declarations and renames them via AST manipulation
- naively combines ASTs into a single program
- strips imports and exports, and concatenates all modules into a single output bundle

## features (there aren't any tbh)

- supports normal ES modules
- bails on cyclic imports

All this assumes you do not do weird stuff in your modules. I'll be trying to add CJS support, but I'm not sure how to fit that in yet.

Also want to implement namespace import support (`import * as whatever from './whereever'`), but that is hard to get right

---

> [!CAUTION]
> This was made solely to learn about the overall structure of a javascript bundler. It does not follow any spec, nor does it make any guarantees about correctness, security, or stability. It does not handle dependencies, or aliased imports.
> I am basically saying this is worthless and you should not use it (except to learn about how it works).

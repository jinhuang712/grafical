# Install

grafical is not on npm yet, so it runs from a clone of its repository. It needs two things first:

- Node 24 or later.
- pnpm.

## From a clone

1. Clone the repository and install its dependencies:

   ```sh
   git clone https://github.com/jinhuang712/grafical.git && cd grafical
   pnpm install
   ```

2. Check that it worked:

   ```sh
   node src/cli/main.ts --help
   ```

   It prints `Usage: grafical [options] [command]` and the entry page of the help.

From a clone, write `node src/cli/main.ts` wherever a command says `grafical`.

## Update

Run `git pull` and then `pnpm install` in the clone.

## Remove

Delete the clone's folder. grafical keeps nothing outside it.

## When it fails

- **`node src/cli/main.ts` fails:** check that `node --version` shows 24 or later, since grafical runs its TypeScript directly on Node.
- **`pnpm` is not found:** install pnpm and run `pnpm install` again.

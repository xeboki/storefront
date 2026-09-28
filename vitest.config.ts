import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The storefront had no test runner.
 *
 * That was tenable while it was components and fetches — you prove a component
 * by looking at it. It stopped being tenable when it grew colour maths and
 * banner scheduling: a twelve-step scale that claims a contrast guarantee is
 * either checked or it is a comment.
 *
 * It could not have one before because `@xeboki/sdk` was declared with pnpm's
 * `workspace:` protocol in a package npm installs, so `npm install` refused
 * outright and nobody could add a dependency at all. `file:` is npm's
 * equivalent and resolves to the same symlink.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

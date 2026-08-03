import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      tsconfigFile: './tsconfig.json',
      module: { type: 'es6' },
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        keepClassNames: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 300_000,
    include: ['src/**/*.integration-spec.ts'],
    testTimeout: 300_000,
  },
});

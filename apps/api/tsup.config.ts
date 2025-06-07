import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/main.ts'],
  format: ['cjs'],
  clean: true,
  sourcemap: true,
});
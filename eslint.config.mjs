// ESLint flat config para el monorepo
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/public/**',
      'apps/web/src/i18n/*.json',
      'data/**',
      'apps/**/dist/**',
      // Config files y scripts de tooling no necesitan lint
      '**/*.config.{js,mjs,cjs,ts}',
      '**/postcss.config.js',
      '**/tailwind.config.ts',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/drizzle.config.ts',
      '**/eslint.config.mjs',
      '**/prettier.config.mjs',
      'scripts/bump-version.js',
      'scripts/mirror-tow.ts',
      'scripts/parse-tow.ts',
      'scripts/parser/**',
      'apps/web/scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    },
  },
];

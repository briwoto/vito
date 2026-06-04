# Copilot Instructions

This document establishes the coding standards and architectural conventions for the **vito** repo — a Playwright + BDD test automation framework that uses GenAI for visual assertions.

---

## Architecture

Follow **Clean Architecture** principles:

- Keep concerns separated: UI interaction, selectors, AI prompts, assertions, and step definitions must never be mixed into a single file.
- Dependencies flow inward: step definitions depend on components; components depend on utils; utils have no dependencies on step definitions or components.
- No business logic in step definitions. Steps are thin orchestration layers that delegate to component classes.

---

## Project Structure

```
src/
  components/<component-name>/   ← one folder per UI component
    <component>.ts               ← component class (singleton)
    selectors.ts                 ← CSS/attribute selectors
    prompts.ts                   ← AI prompt strings (only if AI assertions are used)
    expectedTexts.ts             ← expected text constants for AI pass/fail criteria (only if AI assertions are used)
  utils/
    types.ts                     ← all shared TypeScript types/interfaces
    aiUtils/
      genAI.ts                   ← GenAI API client
      helperPrompts.ts           ← reusable prompt-building helpers
      index.ts                   ← public API for AI utilities
features/                        ← Gherkin .feature files
step-definitions/                ← Playwright BDD step implementations
```

Never place logic outside these layers. Do not create new top-level folders without discussion.

---

## Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Component folder | `kebab-case` | `login`, `sort`, `products` |
| Component class | `PascalCase` matching folder | `class Login`, `class Sort` |
| Selectors class | `<Component>Selectors` | `LoginSelectors`, `SortSelectors` |
| Step definition file | `<feature-name>.steps.ts` | `sample.steps.ts` |
| Feature file | `<feature-name>.feature` | `sample.feature` |
| Prompt exports | `assert<Description>` (camelCase) | `assertProductsSortedByPriceAscending` |
| `expectedTexts` properties | camelCase description of the check | `checkProductsSortedByPriceAscending` |

---

## Component Object Model (COM)

Each UI component lives in its own folder under `src/components/`. The folder structure is strict:

### `<component>.ts` — Component class

- One `class` per file, named after the component (PascalCase).
- **Export as a singleton**: `export default new ClassName();`
- Methods represent user actions or assertions against that component.
- **Only methods called directly from step definitions should be `public`.** Every other helper method must be explicitly `private`. This enforces encapsulation and prevents step definitions from relying on internal implementation details.
- No public state. All properties must be private or absent.
- All public methods must accept `page: Page` as the first parameter (from `@playwright/test`).

```ts
import { Page } from '@playwright/test';
import { ExampleSelectors } from './selectors';

class Example {
  constructor() {}

  async doSomething(page: Page): Promise<void> {
    await page.click(ExampleSelectors.someButton);
  }
}

export default new Example();
```

### `selectors.ts` — Selectors class

- One `class` per file named `<Component>Selectors`.
- All selectors are `static readonly string` properties.
- Use `data-test` attributes or semantic selectors. Prefer specificity over fragility.
- No logic, only constants.

```ts
export class ExampleSelectors {
  static readonly someButton: string = 'button[data-test="some-button"]';
}
```

### `prompts.ts` — AI prompt strings (when AI assertions are needed)

- Export named `const` strings, one per assertion.
- Use `suffixJsonPrompt` from `src/utils/aiUtils/helperPrompts` to enforce JSON response formatting.
- Reference `expectedTexts` constants from `expectedTexts.ts` rather than inline strings.

```ts
import { suffixJsonPrompt } from '../../utils/aiUtils/helperPrompts';
import { expectedTexts } from './expectedTexts';

export const assertSomething = `
Describe what to check in the image.
${suffixJsonPrompt(expectedTexts.someCheck)}
`;
```

### `expectedTexts.ts` — Expected text constants (when AI assertions are needed)

- Export a single `expectedTexts` object with named string properties.
- These strings describe the pass condition in plain English and are embedded into prompts.

```ts
export const expectedTexts = {
  someCheck: 'pass if the condition is met',
};
```

---

## TypeScript Conventions

- **Strict mode is on.** `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` are enforced via `tsconfig.json`.
- **Every function must have an explicit return type annotation.** ESLint enforces `@typescript-eslint/explicit-function-return-type` and `@typescript-eslint/explicit-module-boundary-types`.
- **Every parameter must have a type annotation.** ESLint enforces `@typescript-eslint/typedef`.
- **Never use `any`.** ESLint enforces `@typescript-eslint/no-explicit-any`. If unavoidable (e.g., third-party API surface), suppress with `/* eslint-disable @typescript-eslint/no-explicit-any */` at the top of the file and add a comment explaining why.
- **All custom types and interfaces MUST be defined in `src/utils/types.ts`.** Do not define reusable types inline, in component files, or anywhere else. This applies to both `type` aliases and `interface` declarations. Do not create a separate types file in a component folder.
- Module system is **ESM** (`"type": "module"` in `package.json`). Use `import`/`export`, never `require`.

---

## Indentation & Formatting

- Use **tabs** for indentation (ESLint `indent: ['error', 'tab']`). Never use spaces.
- No trailing whitespace.
- Run `npm run lint` to check and `npm run lint:fix` to auto-fix before committing.

---

## AI Assertions

AI-based visual assertions follow a fixed pattern:

1. Define the expected text in `expectedTexts.ts`.
2. Build the prompt in `prompts.ts` using `suffixJsonPrompt`.
3. In the component class, call `runPrompt` from `src/utils/aiUtils` and evaluate `.result`.
4. `PromptResponse` (from `src/utils/types.ts`) is the return type of all AI calls: `{ result: string; message: string }`.

```ts
import { runPrompt } from '../../utils/aiUtils';
import { assertSomething } from './prompts';

async checkSomething(page: Page): Promise<boolean> {
  const promptResponse = await runPrompt(assertSomething, page);
  return promptResponse.result.toLowerCase() === 'pass';
}
```

- **Never access `genAIClient` outside of `src/utils/aiUtils/`.** It is an internal implementation detail of that module. Components, step definitions, and all other code must only use the public API exported from `src/utils/aiUtils/index.ts` (`runPrompt`, `compareScreenshotsWithAI`).

### `runPrompt` optional parameters

`runPrompt` accepts several optional parameters beyond `promptText` and `page`:

| Parameter | Default | When to override |
|---|---|---|
| `screenshotName` | `'runPrompt-check.png'` | Always provide a unique name per test to prevent screenshot collisions between sequential tests |
| `timeout` | `5000` | Increase for assertions on dynamically-loading content that may take longer to stabilise |
| `screenshotInterval` | `1000` | Increase to reduce polling frequency for slow pages |
| `deleteScreenshot` | `true` | Set to `false` only during local debugging to inspect what the AI received |
| `locator` | `undefined` | Pass a `Locator` to capture only a specific element instead of the full page |

**Parameters are positional.** There is no config object. To use a later parameter while keeping earlier ones at their defaults, pass `undefined` for each skipped parameter:

```ts
// Only override locator, keep all other defaults
const promptResponse = await runPrompt(
  assertSomething,
  page,
  'products-sort-check.png', // screenshotName — required to be unique
  undefined,                  // timeout — use default (5000ms)
  undefined,                  // screenshotInterval — use default (1000ms)
  undefined,                  // deleteScreenshot — use default (true)
  page.locator('.product-list'), // locator
);
```

### `compareScreenshotsWithAI`

Use `compareScreenshotsWithAI` (also exported from `src/utils/aiUtils`) when an assertion requires comparing two distinct page states (e.g., before and after an action). It sends multiple screenshots in a single prompt.

**Key difference from `runPrompt`:** `compareScreenshotsWithAI` does **not** capture screenshots itself. It accepts an array of file paths to screenshots that already exist on disk. The caller is responsible for capturing each screenshot beforehand (e.g., via `page.screenshot({ path: '...' })`) and passing those paths in. `runPrompt`, by contrast, handles all screenshot capture internally.

```ts
import { compareScreenshotsWithAI } from '../../utils/aiUtils';

// Caller captures both screenshots, then passes paths
async checkStateChangedAfterAction(page: Page): Promise<boolean> {
  await page.screenshot({ path: './screenshots/before.png' });
  // ... perform action ...
  await page.screenshot({ path: './screenshots/after.png' });
  const promptResponse = await compareScreenshotsWithAI(
    assertSomethingChanged,
    ['./screenshots/before.png', './screenshots/after.png'],
  );
  return promptResponse.result.toLowerCase() === 'pass';
}
```

Do not use `compareScreenshotsWithAI` for single-state assertions — use `runPrompt` instead. Do not pass a `Page` object to `compareScreenshotsWithAI`; it only accepts `string[]` file paths.

---

## BDD / Testing

- Feature files are written in Gherkin and live in `features/`.
- Step definitions live in `step-definitions/` and use `playwright-bdd` (`createBdd()`).
- After adding or modifying `.feature` files, run `npx bddgen` to regenerate spec files before running tests.
- **`features/**/*.spec.js` files are auto-generated by `bddgen`. Never edit them manually.** They are gitignored and will be overwritten on the next `bddgen` run.
- Steps must be thin: delegate all logic to component classes. The only direct Playwright call permitted in a step definition is `page.goto`, and it must only appear in `Given` steps.
- Use `assert` from Node's built-in `assert` module for assertions in step definitions.
- Step definition files must import component singletons, not instantiate classes directly.
- Step fixture parameters must use the destructuring pattern: `{ page }: { page: Page }`.

```ts
Given('I am on the login page', async ({ page }: { page: Page }): Promise<void> => {
  await page.goto('https://example.com/');
  await Login.confirmLoginPage(page);
});

When('I do something', async ({ page }: { page: Page }): Promise<void> => {
  await SomeComponent.doSomething(page); // no page.goto here
});
```

---

## Environment Variables

- All secrets and configuration are stored in `.env` (gitignored). See `.env.example` for the required keys.
- Load env vars via `dotenv` — it is already configured in `playwright.config.ts`. Do not call `dotenv.config()` elsewhere.
- Access env vars via `process.env`. Use the non-null assertion operator (`!`) only when the variable is guaranteed to be set (e.g., `process.env.SAUCE_USERNAME!`).
- Never hardcode credentials, URLs, or environment-specific values in source files.

---

## Node Version

Use Node **24.12.0**. Run `nvm use 24.12.0` if your environment uses a different version.

---

## Playwright Configuration

The settings in `playwright.config.ts` are intentional and must not be changed without deliberate consideration:

- `fullyParallel: false` — tests run sequentially to prevent concurrent screenshots overwriting each other in the `./screenshots/` directory.
- `headless: false` — AI vision assertions require a fully rendered, visible browser window to produce accurate screenshots.
- `workers: 1` on CI — enforces sequential execution in CI environments.
- `timeout: 300000` — AI polling loops can be slow; this generous timeout accommodates them.

---

## Screenshots

- Screenshots are written to `./screenshots/` and are **transient**. They are deleted automatically after a successful AI assertion (`deleteScreenshot: true` by default).
- Never commit files from the `screenshots/` directory.
- Always pass a unique `screenshotName` to `runPrompt` when a component has more than one AI assertion, to prevent sequential tests from overwriting each other's screenshots.

---

## No Magic Numbers

Do not inline numeric literals for retry counts, timeouts, or intervals. Define them as named constants at the top of the file:

```ts
const MAX_RETRIES = 3;
const POLLING_INTERVAL_MS = 1000;
const DEFAULT_TIMEOUT_MS = 5000;
```

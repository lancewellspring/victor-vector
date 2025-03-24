# Contributing Guidelines

## Code Style

- This project uses ES Modules exclusively
- Always use `import/export` syntax, never `require()/module.exports`
- Server-side code follows the same module pattern as client-side code
- Use relative imports (e.g., `import { x } from '../utils/helpers.js'`) or aliased imports (e.g., `import { x } from '@shared/utils/helpers.js'`)

See our ESLint configuration for enforced patterns.
# AGENTS.md

## Build & Development Commands

```bash
npm run build          # TypeScript + frontend build
npm run dev            # Dev mode with tsx
npm test               # Run tests (vitest)
npm run test:watch     # Watch mode tests
npm run lint           # ESLint src/**/*.ts
cd frontend && npm run build   # Build frontend only
```

## Architecture

- **ESM modules** throughout (`"type": "module"`)
- **TypeScript 5.4+** with strict mode, ES2022 target, bundler resolution
- **CLI** (Commander.js) → **Scanner** (orchestrator) → **32+ parsers** → **DependencyGraph**
- Three interfaces: CLI (`arch-viz`), Web Dashboard (React + Express), MCP Server (stdio/HTTP)
- `PathResolver` abstracts all filesystem operations for testability
- Frontend builds to `dist/public/` and served statically by Express

## Code Style

- No comments unless requested
- ESM imports with `.js` extension (e.g. `import { X } from './foo.js'`)
- Zod for schema validation
- Class-based parsers with `parse()` method
- Typed dependency edges: `depends`, `builds`, `network`, `connects`, `volume`, `routes`

## Project Structure

```
src/
├── cli.ts                    # CLI entry point (5 commands: analyze, serve, mcp, review, time-travel)
├── core/                     # Core modules
│   ├── scanner.ts            # Central orchestrator
│   ├── path-resolver.ts      # Filesystem abstraction
│   ├── docker-scanner.ts     # Docker config detection
│   ├── circular-detector.ts  # Circular dependency detection
│   ├── docker-auditor.ts     # Docker security audit
│   ├── env-analyzer.ts       # Environment variable analysis
│   ├── git-history-scanner.ts # Git history time travel
│   ├── gateway-detector.ts   # API gateway detection
│   ├── dataflow-analyzer.ts  # DataFlow bottleneck analysis
│   ├── build-edge-generator.ts # CI build edge generation
│   ├── routes-edge-generator.ts # Proxy routes edge generation
│   └── security-boundary-analyzer.ts
├── parsers/                  # 32+ config parsers
│   ├── workspace-parser.ts   # pnpm-workspace.yaml
│   ├── package-parser.ts     # package.json
│   ├── docker-compose-parser.ts
│   ├── dockerfile-parser.ts
│   ├── prisma-parser.ts, typeorm-parser.ts, drizzle-parser.ts
│   ├── sequelize-parser.ts, sqlalchemy-parser.ts
│   ├── nginx-parser.ts, traefik-parser.ts, caddy-parser.ts
│   ├── github-actions-parser.ts, gitlab-ci-parser.ts, jenkins-parser.ts, circleci-parser.ts
│   ├── composer-parser.ts, python-parser.ts
│   └── ... (ai-model, hardware, dataflow, proxy, db-schema, env, ci-cd, dependency)
├── mcp/                      # MCP server (39 tools)
├── server/                   # Express API (17+ REST endpoints)
├── ai/                       # LLM review engine (Ollama/OpenRouter/LMStudio)
├── types/                    # TypeScript type definitions
└── utils/                    # Utility functions
frontend/                     # React 18 + Vite 5 + @xyflow/react + dagre
tests/                        # Vitest test suite
```

## Testing

- **Framework:** Vitest with globals (`describe`, `it`, `expect` available without import)
- **Location:** `tests/` directory, files named `*.test.ts`
- **Pattern:** Create temp dirs in `beforeEach`, clean in `afterEach` with `fs.rm({ recursive: true, force: true })`
- Mock filesystem for parser tests using `os.tmpdir()` + `fs.mkdtemp()`
- Coverage threshold: 80% statements/branches/functions/lines

## Key Patterns

- **Strategy pattern** for 32+ pluggable parsers
- **DependencyGraph** with typed nodes (package, service, hardware, database, gateway) and typed edges
- **Scanner** coordinates all parsers into unified `ProjectStructure`
- **MCP dual transport:** stdio for CLI integration, HTTP for remote access
- **PathResolver** wraps all file operations — never use `fs` directly in parsers

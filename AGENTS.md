# AGENTS.md

## Build ve Geliştirme Komutları

```bash
npm run build          # TypeScript + frontend build
npm run dev            # Geliştirme modu (tsx)
npm test               # Testleri çalıştır (vitest)
npm run test:watch     # İzleme modunda test
npm run lint           # ESLint src/**/*.ts
cd frontend && npm run build   # Sadece frontend build
```

## Mimari

- **ESM modülleri** (`"type": "module"`)
- **TypeScript 5.4+** sıkı mod, ES2022 hedef, bundler çözümleme
- **CLI** (Commander.js) → **Scanner** (orkestratör) → **32+ parser** → **DependencyGraph**
- Üç arayüz: CLI (`arch-viz`), Web Dashboard (React + Express), MCP Sunucusu (stdio/HTTP)
- `PathResolver` tüm dosya sistemi işlemlerini test edilebilirlik için soyutlar
- Frontend `dist/public/` dizinine build edilir ve Express tarafından statik olarak sunulur

## Kod Stili

- İstenmedikçe yorum ekleme
- ESM import'larında `.js` uzantısı kullan (ör. `import { X } from './foo.js'`)
- Şema doğrulama için Zod
- `parse()` methodlu sınıf tabanlı parser'lar
- Tipli bağımlılık kenarları: `depends`, `builds`, `network`, `connects`, `volume`, `routes`

## Proje Yapısı

```
src/
├── cli.ts                    # CLI giriş noktası (5 komut: analyze, serve, mcp, review, time-travel)
├── core/                     # Çekirdek modüller
│   ├── scanner.ts            # Merkez orkestratör
│   ├── path-resolver.ts      # Dosya sistemi soyutlama
│   ├── docker-scanner.ts     # Docker konfigürasyon tespiti
│   ├── circular-detector.ts  # Döngüsel bağımlılık tespiti
│   ├── docker-auditor.ts     # Docker güvenlik denetimi
│   ├── env-analyzer.ts       # Ortam değişkeni analizi
│   ├── git-history-scanner.ts # Git geçmişi tarama
│   ├── gateway-detector.ts   # API gateway tespiti
│   ├── dataflow-analyzer.ts  # DataFlow darboğaz analizi
│   ├── build-edge-generator.ts # CI build kenar üretimi
│   ├── routes-edge-generator.ts # Proxy routes kenar üretimi
│   └── security-boundary-analyzer.ts
├── parsers/                  # 32+ config parser
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
├── mcp/                      # MCP sunucu (39 tool)
├── server/                   # Express API (17+ REST endpoint)
├── ai/                       # LLM inceleme motoru (Ollama/OpenRouter/LMStudio)
├── types/                    # TypeScript tip tanımları
└── utils/                    # Yardımcı fonksiyonlar
frontend/                     # React 18 + Vite 5 + @xyflow/react + dagre
tests/                        # Vitest test süiti
```

## Test

- **Çerçeve:** Vitest, global'lerle (`describe`, `it`, `expect` import olmadan kullanılabilir)
- **Konum:** `tests/` dizini, dosyalar `*.test.ts` adlandırılmış
- **Örüntü:** `beforeEach` ile geçici dizin oluştur, `afterEach` ile `fs.rm({ recursive: true, force: true })` ile temizle
- Parser testleri için `os.tmpdir()` + `fs.mkdtemp()` ile dosya sistemi mock'la
- Kapsam eşiği: %80 statements/branches/functions/lines

## Anahtar Örüntüler

- 32+ takılabilir parser için **strateji kalıbı**
- Tipli node'lar (package, service, hardware, database, gateway) ve tipli kenarlar ile **DependencyGraph**
- **Scanner** tüm parser'ları birleşik `ProjectStructure` halinde orkestra eder
- **MCP çift transport:** CLI entegrasyonu için stdio, uzan erişim için HTTP
- **PathResolver** tüm dosya işlemlerini sarar — parser'larda asla `fs` kullanma

# Development

## Requirements

- Node.js 20+
- npm veya pnpm

## Setup

```bash
# Repository'yi klonlayın
git clone https://github.com/crowroser/local-architecturer.git
cd local-architecturer

# Bağımlılıkları kurun
npm install
cd frontend && npm install && cd ..
```

## Scripts

### Build

```bash
# TypeScript derleme + Frontend build
npm run build

# Sadece Frontend build
cd frontend && npm run build
```

### Development

```bash
# Backend development
npm run dev

# Frontend development
cd frontend && npm run dev
```

### Test

```bash
# Tüm testleri çalıştır (132 test)
npm test

# Watch modunda
npm run test:watch
```

### Lint

```bash
npm run lint
```

## Project Structure

```
local-architecturer/
├── src/
│   ├── cli.ts                    # Ana CLI giriş noktası (5 komut)
│   ├── commands/                 # CLI komutları
│   │   ├── analyze.ts           # analyze komutu
│   │   ├── serve.ts             # serve komutu
│   │   ├── mcp.ts               # mcp komutu
│   │   ├── review.ts            # review komutu
│   │   └── time-travel.ts       # time-travel komutu
│   ├── core/                     # Çekirdek modüller
│   │   ├── path-resolver.ts     # Dosya yolu çözümleme
│   │   ├── scanner.ts           # Ana tarama motoru (cache mekanizmalı)
│   │   ├── docker-scanner.ts    # Docker tarama
│   │   ├── circular-detector.ts # Döngüsel bağımlılık tespiti
│   │   ├── docker-auditor.ts    # Docker güvenlik denetimi
│   │   ├── env-analyzer.ts      # Env değişken analizi
│   │   ├── git-history-scanner.ts # Git geçmişi tarama
│   │   ├── gateway-detector.ts  # API gateway tespiti
│   │   ├── dataflow-analyzer.ts # DataFlow darboğaz analizi
│   │   ├── build-edge-generator.ts # CI build kenar üretimi
│   │   └── routes-edge-generator.ts # Proxy routes kenar üretimi
│   ├── parsers/                  # 28 config parser
│   │   ├── workspace-parser.ts  # pnpm-workspace.yaml
│   │   ├── package-parser.ts    # package.json
│   │   ├── dependency-parser.ts # Bağımlılık analizi
│   │   ├── docker-compose-parser.ts
│   │   ├── dockerfile-parser.ts
│   │   ├── kubernetes-parser.ts # Kubernetes manifestleri
│   │   ├── prisma-parser.ts
│   │   ├── typeorm-parser.ts
│   │   ├── drizzle-parser.ts
│   │   ├── sequelize-parser.ts
│   │   ├── sqlalchemy-parser.ts
│   │   ├── nginx-parser.ts
│   │   ├── traefik-parser.ts
│   │   ├── caddy-parser.ts
│   │   ├── github-actions-parser.ts
│   │   ├── gitlab-ci-parser.ts
│   │   ├── jenkins-parser.ts
│   │   ├── circleci-parser.ts
│   │   ├── composer-parser.ts
│   │   ├── python-parser.ts
│   │   └── ... (ai-model, hardware, dataflow, proxy, db-schema, env, ci-cd)
│   ├── mcp/                      # MCP sunucu ve 40 tool
│   │   ├── server.ts            # MCP sunucu
│   │   ├── mermaid-builder.ts   # Mermaid graph builder
│   │   └── port-conflict-detector.ts # Port conflict
│   ├── server/                   # Express sunucu
│   │   └── express-server.ts    # REST API (18+ endpoint)
│   ├── ai/                       # LLM review engine
│   │   └── review-engine.ts     # Ollama/OpenRouter/LMStudio desteği
│   ├── types/                    # TypeScript tip tanımları
│   │   ├── index.ts
│   │   ├── cicd.ts
│   │   ├── database.ts
│   │   ├── dataflow.ts
│   │   └── proxy.ts
│   └── utils/                    # Yardımcı modüller
│       ├── logger.ts            # Structured logging (JSON format desteği)
│       ├── browser-opener.ts    # Browser açma
│       └── ai-model-database.ts # AI model veritabanı
├── frontend/                     # React 18 + Vite 5 + @xyflow/react + dagre
│   ├── src/
│   │   ├── App.tsx              # Ana React bileşeni
│   │   ├── components/
│   │   │   ├── GraphView.tsx    # React Flow grafik
│   │   │   ├── NodeTypes.tsx    # Özel node tipleri
│   │   │   ├── FilterPanel.tsx  # Filtreleme paneli
│   │   │   ├── DetailPanel.tsx  # Detay paneli
│   │   │   ├── ThemeToggle.tsx  # Tema değiştirme
│   │   │   ├── TimelineSlider.tsx # Zaman çizelgesi
│   │   │   ├── PipelineView.tsx # CI/CD pipeline görünümü
│   │   │   ├── ProfilerPanel.tsx # AI profiller paneli
│   │   │   ├── DatabasePanel.tsx # Veritabanı paneli
│   │   │   ├── ProxyView.tsx    # Proxy görünümü
│   │   │   ├── DataFlowView.tsx # Data flow görünümü
│   │   │   └── SecurityPanel.tsx # Güvenlik paneli
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx  # Tema bağlamı
│   │   └── utils/
│   │       └── layout.ts        # Dagre layout
│   └── vite.config.ts           # Vite yapılandırması
├── tests/                        # 132 Vitest test
│   ├── parsers/                  # Parser testleri
│   ├── mcp/                      # MCP testleri
│   ├── server/                   # Server testleri
│   └── *.test.ts                 # Core testleri
├── docs/wiki/                    # Wiki sayfaları
└── dist/                         # Build çıktıları
```

## Adding New Features

### Yeni Bir Parser Ekleme

1. `src/parsers/` dizininde yeni dosya oluşturun
2. Parser sınıfını tanımlayın
3. `src/core/scanner.ts` dosyasında entegre edin
4. `src/mcp/server.ts` dosyasında MCP tool ekleyin
5. `src/server/express-server.ts` dosyasında API endpoint ekleyin
6. Test dosyası ekleyin

### Yeni Bir MCP Tool Ekleme

1. `src/mcp/server.ts` dosyasında `registerTools` metoduna ekleyin
2. Tool tanımını ve handler'ı yazın
3. Test dosyası ekleyin

### Yeni Bir API Endpoint Ekleme

1. `src/server/express-server.ts` dosyasında `setupRoutes` metoduna ekleyin
2. Route handler'ı yazın
3. Test dosyası ekleyin

## Testing

```bash
# Tüm testler (132 test)
npm test

# Belirli bir test dosyası
npx vitest run tests/parsers/kubernetes-parser.test.ts

# Watch modunda
npm run test:watch
```

## Build & Release

```bash
# Build al
npm run build

# Version güncelle
npm version patch  # veya minor, major

# Publish
npm publish
```

## Logger

Proje structured logging desteği sunar:

```bash
# JSON formatında loglama
LOG_FORMAT=json npm run dev

# Debug seviyesinde loglama
DEBUG=true npm run dev
```

```typescript
import { Logger } from './utils/logger.js';

const logger = new Logger('[MyModule] ');
logger.info('İşlem başarılı', { userId: 123 });
logger.error('Hata oluştu', { code: 'AUTH_FAILED' });
```

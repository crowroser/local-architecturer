# Development

## Requirements

- Node.js 20+
- npm veya pnpm

## Setup

```bash
# Repository'yi klonlayın
git clone https://github.com/username/local-architecturer.git
cd local-architecturer

# Bağımlılıkları kurun
npm install
cd frontend && npm install && cd ..
```

## Scripts

### Build

```bash
# TypeScript derleme
npm run build

# Frontend build
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
# Testleri çalıştır
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
│   ├── cli.ts                    # Ana CLI giriş noktası
│   ├── commands/                 # CLI komutları
│   │   ├── analyze.ts           # analyze komutu
│   │   ├── serve.ts             # serve komutu
│   │   └── mcp.ts               # mcp komutu
│   ├── core/                     # Çekirdek modüller
│   │   ├── path-resolver.ts     # Dosya yolu çözümleme
│   │   ├── scanner.ts           # Ana tarama motoru
│   │   └── docker-scanner.ts    # Docker tarama
│   ├── parsers/                  # Dosya parser'ları
│   │   ├── workspace-parser.ts  # pnpm-workspace.yaml
│   │   ├── package-parser.ts    # package.json
│   │   ├── dependency-parser.ts # Bağımlılık analizi
│   │   └── docker-compose-parser.ts # docker-compose.yml
│   ├── mcp/                      # MCP sunucu ve tool'lar
│   │   ├── server.ts            # MCP sunucu
│   │   ├── mermaid-builder.ts   # Mermaid graph builder
│   │   └── port-conflict-detector.ts # Port conflict
│   ├── server/                   # Express sunucu
│   │   └── express-server.ts    # REST API
│   └── utils/                    # Yardımcı modüller
│       ├── logger.ts            # Logging
│       └── browser-opener.ts    # Browser açma
├── frontend/                     # React/Vite frontend
│   ├── src/
│   │   ├── App.tsx              # Ana React bileşeni
│   │   ├── components/
│   │   │   ├── GraphView.tsx    # React Flow grafik
│   │   │   └── NodeTypes.tsx    # Özel node tipleri
│   │   └── utils/
│   │       └── layout.ts        # Dagre layout
│   └── vite.config.ts           # Vite yapılandırması
├── tests/                        # Test dosyaları
└── docs/wiki/                    # Wiki sayfaları
```

## Adding New Features

### Yeni Bir Parser Ekleme

1. `src/parsers/` dizininde yeni dosya oluşturun
2. Parser sınıfını tanımlayın
3. `src/core/scanner.ts` dosyasında entegre edin
4. Test dosyası ekleyin

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
# Tüm testler
npm test

# Belirli bir test dosyası
npx vitest run tests/path-resolver.test.ts

# Watch modunda
npm run test:watch
```

## Build & Release

```bash
# Build al
npm run build
cd frontend && npm run build && cd ..

# Version güncelle
npm version patch  # veya minor, major

# Publish
npm publish
```

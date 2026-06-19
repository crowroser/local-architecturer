# Local Architecture Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

Geliştiricilerin terminal üzerinden kendi projelerinin kök dizininde çalıştırabileceği; pnpm monorepo yapılarını ve Docker konfigürasyonlarını otomatik analiz eden bir Node.js CLI aracı ve MCP (Model Context Protocol) sunucusu.

## Features

- **Monorepo Analysis**: pnpm workspace yapısını otomatik tespit eder
- **Docker Analysis**: docker-compose.yml dosyalarını parse eder
- **Dependency Graph**: Paketler ve servisler arasındaki bağımlılıkları görselleştirir
- **MCP Server**: AI asistanları için tool seti sunar
- **Web Dashboard**: React Flow ile interaktif grafik görünümü
- **Port Conflict Detection**: Docker servislerindeki port çakışmalarını tespit eder

## Installation

```bash
# npm ile
npm install -g local-architecturer

# veya doğrudan
npx local-architecturer analyze -p /path/to/project
```

## Usage

### Proje Analizi

```bash
# JSON çıktısı
arch-viz analyze -p /path/to/project -f json

# Text çıktısı
arch-viz analyze -p /path/to/project -f text
```

### Web Dashboard

```bash
# Sunucuyu başlat ve browser'ı aç
arch-viz serve -p /path/to/project

# Özel port ile
arch-viz serve -p . -port 3000
```

### MCP Server (AI Asistanları İçin)

```bash
# MCP sunucusunu başlat
arch-viz mcp -p /path/to/project
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Sağlık kontrolü |
| `/api/graph` | GET | Bağımlılık grafiği |
| `/api/packages` | GET | Workspace paketleri |
| `/api/docker` | GET | Docker servisleri |
| `/api/analyze` | GET | Tam proje analizi |

## MCP Tools

| Tool | Description |
|------|-------------|
| `analyze_project` | Tam proje analizi |
| `get_packages` | Workspace paketlerini getir |
| `get_monorepo_graph` | Monorepo grafiği (JSON + Mermaid) |
| `get_docker_services` | Docker servisleri (port conflict analizi) |
| `get_node_details` | Belirli bir node'un detayları |
| `get_dependency_graph` | Bağımlılık grafiği |

## Example Output

```json
{
  "nodes": [
    { "id": "@app/core", "type": "package", "name": "@app/core" },
    { "id": "@app/ui", "type": "package", "name": "@app/ui" },
    { "id": "web", "type": "service", "name": "web" }
  ],
  "edges": [
    { "source": "@app/ui", "target": "@app/core", "type": "depends" },
    { "source": "web", "target": "api", "type": "network" }
  ]
}
```

## Development

```bash
# Bağımlılıkları kur
npm install
cd frontend && npm install

# Geliştirme modunda çalıştır
npm run dev

# Testleri çalıştır
npm test

# Build al
npm run build
cd frontend && npm run build
```

## Project Structure

```
local-architecturer/
├── src/
│   ├── cli.ts                    # Ana CLI giriş noktası
│   ├── commands/                 # CLI komutları
│   ├── core/                     # Çekirdek modüller
│   ├── parsers/                  # Dosya parser'ları
│   ├── mcp/                      # MCP sunucu ve tool'lar
│   ├── server/                   # Express sunucu
│   └── utils/                    # Yardımcı modüller
├── frontend/                     # React/Vite frontend
│   └── src/
│       ├── components/           # React bileşenleri
│       └── utils/                # Yardımcı fonksiyonlar
├── tests/                        # Test dosyaları
└── dist/                         # Build çıktıları
```

## License

MIT

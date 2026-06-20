# Local Architecture Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

Geliştiricilerin terminal üzerinden kendi projelerinin kök dizininde çalıştırabileceği; pnpm monorepo yapılarını ve Docker konfigürasyonlarını otomatik analiz eden bir Node.js CLI aracı ve MCP (Model Context Protocol) sunucusu.

## Features

- **Monorepo Analysis**: pnpm workspace yapısını otomatik tespit eder
- **Docker Analysis**: docker-compose.yml dosyalarını parse eder
- **Dependency Graph**: Paketler ve servisler arasındaki bağımlılıkları görselleştirir
- **MCP Server**: AI asistanları için 39 tool sunar
- **Web Dashboard**: React Flow ile interaktif grafik görünümü
- **Port Conflict Detection**: Docker servislerindeki port çakışmalarını tespit eder
- **CI/CD Pipeline Analysis**: GitHub Actions, GitLab CI, Jenkins, CircleCI yapılandırmalarını parse eder
- **Git History Time Travel**: Mimari evrimi commit geçmişinden analiz eder
- **AI Architecture Review**: LLM ile otomatik mimari inceleme ve öneriler
- **Database Schema Parsing**: Prisma, TypeORM, Drizzle, Sequelize, SQLAlchemy desteği
- **Proxy Configuration**: Traefik, Nginx, Caddy reverse proxy analizi
- **Gateway Detection**: API gateway ve reverse proxy tespiti
- **Security Audit**: Docker güvenlik denetimi ve volume analizi
- **Environment Coverage**: .env dosyaları ile kaynak kod arasındaki env değişken eşleşmesi
- **AI Model Profiling**: AI model VRAM gereksinimleri hesaplama
- **Hardware Detection**: Serial, USB, GPIO cihaz tespiti

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

# HTTP transport ile
arch-viz mcp -p . -t http -port 3001
```

### AI Architecture Review

```bash
# Ollama ile
arch-viz review -p /path/to/project --provider ollama --model qwen2.5

# OpenRouter ile
arch-viz review -p /path/to/project --provider openrouter --model meta-llama/llama-3-8b --api-key YOUR_KEY
```

### Git History Time Travel

```bash
# Son 50 commit'i analiz et
arch-viz time-travel -p /path/to/project -c 50
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Sağlık kontrolü |
| `/api/graph` | GET | Bağımlılık grafiği |
| `/api/packages` | GET | Workspace paketleri |
| `/api/docker` | GET | Docker servisleri |
| `/api/analyze` | GET | Tam proje analizi |
| `/api/circular` | GET | Döngüsel bağımlılık tespiti |
| `/api/docker-audit` | GET | Docker güvenlik denetimi |
| `/api/env-coverage` | GET | Env değişken eşleşmesi |
| `/api/ai-profile` | GET | AI model profili |
| `/api/history` | GET | Git geçmişi |
| `/api/history/:commit` | GET | Tek commit anlık görüntüsü |
| `/api/pipelines` | GET | CI/CD pipeline'ları |
| `/api/database` | GET | Veritabanı şemaları |
| `/api/proxy` | GET | Reverse proxy yapılandırmaları |
| `/api/dataflow` | GET | Data flow pipeline'ları |
| `/api/security-boundaries` | GET | Güvenlik sınırları |

## MCP Tools (39 Tool)

### Core Analysis
| Tool | Description |
|------|-------------|
| `analyze_project` | Tam proje analizi |
| `get_packages` | Workspace paketlerini getir |
| `get_monorepo_graph` | Monorepo grafiği (JSON + Mermaid) |
| `get_dependency_graph` | Bağımlılık grafiği (filtrelenmiş) |
| `get_node_details` | Belirli bir node'un detayları |
| `get_health_score` | Proje sağlık skoru |
| `search_packages` | Paket ara |
| `detect_circular_dependencies` | Döngüsel bağımlılık tespiti |

### Docker
| Tool | Description |
|------|-------------|
| `get_docker_services` | Docker servisleri (port conflict analizi) |
| `analyze_dockerfile` | Dockerfile analizi |
| `audit_docker_security` | Docker güvenlik denetimi |
| `parse_docker_compose_file` | Tek Docker Compose dosyası analizi |
| `detect_port_conflicts` | Port çakışması tespiti |

### Database & Proxy
| Tool | Description |
|------|-------------|
| `get_database_schemas` | Veritabanı şemaları (Prisma/TypeORM/Drizzle/Sequelize/SQLAlchemy) |
| `get_proxy_configurations` | Reverse proxy yapılandırmaları |
| `parse_nginx_config` | Nginx konfigürasyon parse |
| `detect_gateways` | API gateway tespiti |
| `get_routes_edges` | Proxy routing bağımlılık kenarları |

### CI/CD & Git
| Tool | Description |
|------|-------------|
| `get_ci_cd_pipelines` | CI/CD pipeline'ları |
| `get_build_edges` | CI build bağımlılık kenarları |
| `time_travel` | Git geçmişi ile mimari evrim |

### Environment & Security
| Tool | Description |
|------|-------------|
| `get_env_coverage` | Env değişken eşleşmesi |
| `analyze_env_file` | Tek .env dosyası analizi |
| `get_security_boundaries` | Güvenlik sınırları |

### AI & Hardware
| Tool | Description |
|------|-------------|
| `review_architecture` | AI destekli mimari inceleme |
| `get_ai_profile` | AI model profili |
| `lookup_ai_model` | AI model VRAM gereksinimleri |
| `get_hardware_devices` | Hardware cihaz tespiti |

### Data Flow & Visualization
| Tool | Description |
|------|-------------|
| `get_data_flows` | Data flow pipeline'ları |
| `analyze_dataflow_bottlenecks` | DataFlow darboğaz analizi |
| `get_mermaid_diagram` | Mermaid diyagram üretimi |

### Language Support
| Tool | Description |
|------|-------------|
| `parse_python_dependencies` | Python bağımlılık parse |
| `parse_composer_packages` | PHP/Composer bağımlılık parse |
| `parse_workspace_config` | Monorepo workspace tespiti |
| `parse_sequelize_models` | Sequelize ORM model parse |
| `parse_sqlalchemy_models` | SQLAlchemy ORM model parse |

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
│   ├── cli.ts                    # Ana CLI giriş noktası (5 komut)
│   ├── commands/                 # CLI komutları (analyze, serve, mcp, review, time-travel)
│   ├── core/                     # Çekirdek modüller
│   │   ├── scanner.ts            # Merkez orkestratör
│   │   ├── path-resolver.ts      # Dosya sistemi soyutlama
│   │   ├── docker-scanner.ts     # Docker konfigürasyon tespiti
│   │   ├── circular-detector.ts  # Döngüsel bağımlılık tespiti
│   │   ├── docker-auditor.ts     # Docker güvenlik denetimi
│   │   ├── env-analyzer.ts       # Env değişken analizi
│   │   ├── git-history-scanner.ts # Git geçmişi tarama
│   │   ├── gateway-detector.ts   # API gateway tespiti
│   │   ├── dataflow-analyzer.ts  # DataFlow darboğaz analizi
│   │   ├── build-edge-generator.ts # CI build kenar üretimi
│   │   └── routes-edge-generator.ts # Proxy routes kenar üretimi
│   ├── parsers/                  # 32+ config parser
│   │   ├── workspace-parser.ts   # pnpm-workspace.yaml
│   │   ├── package-parser.ts     # package.json
│   │   ├── docker-compose-parser.ts
│   │   ├── dockerfile-parser.ts
│   │   ├── prisma-parser.ts, typeorm-parser.ts, drizzle-parser.ts
│   │   ├── sequelize-parser.ts, sqlalchemy-parser.ts
│   │   ├── nginx-parser.ts, traefik-parser.ts, caddy-parser.ts
│   │   ├── github-actions-parser.ts, gitlab-ci-parser.ts, jenkins-parser.ts, circleci-parser.ts
│   │   ├── composer-parser.ts, python-parser.ts
│   │   └── ... (ai-model, hardware, dataflow, proxy, db-schema, env, ci-cd, dependency)
│   ├── mcp/                      # MCP sunucu ve 39 tool
│   ├── server/                   # Express sunucu (17+ REST endpoint)
│   ├── ai/                       # LLM review engine (Ollama/OpenRouter/LMStudio)
│   ├── types/                    # TypeScript tip tanımları
│   └── utils/                    # Yardımcı modüller
├── frontend/                     # React 18 + Vite 5 + @xyflow/react + dagre
├── tests/                        # Vitest test suite
└── dist/                         # Build çıktıları
```

## License

MIT

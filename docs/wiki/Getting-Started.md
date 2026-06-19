# Getting Started

## Installation

```bash
# npm ile globally
npm install -g local-architecturer

# veya npx ile
npx local-architecturer analyze -p /path/to/project
```

## Requirements

- Node.js 20+
- pnpm (monorepo analizi için)

## First Steps

### 1. Projenizi Analiz Edin

```bash
# Kök dizinde
arch-viz analyze -p .

# JSON çıktısı
arch-viz analyze -p . -f json

# Text çıktısı
arch-viz analyze -p . -f text
```

### 2. Web Dashboard'u Açın

```bash
arch-viz serve -p .
```

Tarayıcınız otomatik olarak açılacaktır. Açılmazsa `http://localhost:4000` adresini ziyaret edin.

### 3. MCP Server'ı Başlatın (AI Asistanları İçin)

```bash
arch-viz mcp -p .
```

## Example Project Structure

```
my-project/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── core/
│   │   └── package.json
│   └── ui/
│       └── package.json
├── docker-compose.yml
└── services/
    └── api/
        └── Dockerfile
```

## Example Output

```json
{
  "name": "my-project",
  "packages": [
    { "name": "@my/core", "version": "1.0.0" },
    { "name": "@my/ui", "version": "1.0.0" }
  ],
  "dockerConfigs": [
    {
      "type": "docker-compose",
      "services": ["web", "api", "db"]
    }
  ],
  "dependencies": {
    "nodes": [...],
    "edges": [...]
  }
}
```

# Home

**Local Architecture Analyzer** - Geliştiricilerin projelerinin mimari yapısını analiz etmesi için geliştirilmiş bir CLI aracı ve MCP sunucusu.

## Quick Links

- [Getting Started](Getting-Started)
- [CLI Commands](CLI-Commands)
- [MCP Server](MCP-Server)
- [API Reference](API-Reference)
- [Web Dashboard](Web-Dashboard)
- [Development](Development)

## Features

- Monorepo (pnpm workspace) analizi
- Docker Compose parsing ve güvenlik denetimi
- Dependency graph görselleştirmesi
- MCP Server — 39 tool ile AI asistanları için
- React Flow ile interaktif dashboard
- Port conflict detection
- CI/CD pipeline analizi (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- Git history time travel — mimari evrim analizi
- AI architecture review — LLM ile otomatik inceleme
- Database schema parsing (Prisma, TypeORM, Drizzle, Sequelize, SQLAlchemy)
- Reverse proxy analizi (Traefik, Nginx, Caddy)
- API gateway tespiti
- Environment variable coverage analizi
- AI model VRAM gereksinimleri hesaplama
- Hardware cihaz tespiti (Serial, USB, GPIO)

## Quick Start

```bash
# Kurulum
npm install -g local-architecturer

# Proje analizi
arch-viz analyze -p /path/to/project

# Web dashboard
arch-viz serve -p /path/to/project

# MCP server (AI asistanları için)
arch-viz mcp -p /path/to/project

# AI architecture review
arch-viz review -p /path/to/project --provider ollama --model qwen2.5
```

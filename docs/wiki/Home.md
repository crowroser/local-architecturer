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
- Docker Compose parsing
- Dependency graph görselleştirmesi
- MCP Server (AI asistanları için)
- React Flow ile interaktif dashboard
- Port conflict detection

## Quick Start

```bash
# Kurulum
npm install -g local-architecturer

# Proje analizi
arch-viz analyze -p /path/to/project

# Web dashboard
arch-viz serve -p /path/to/project
```

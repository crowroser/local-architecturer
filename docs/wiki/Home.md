# Ana Sayfa

**Local Architecture Analyzer** - Geliştiricilerin projelerinin mimari yapısını analiz etmesi için geliştirilmiş bir CLI aracı ve MCP sunucusu.

## Hızlı Bağlantılar

- [Başlangıç](Getting-Started)
- [CLI Komutları](CLI-Commands)
- [MCP Sunucusu](MCP-Server)
- [API Referansı](API-Reference)
- [Web Dashboard](Web-Dashboard)
- [Geliştirme](Development)

## Özellikler

- Monorepo (pnpm workspace) analizi
- Docker Compose parsing ve güvenlik denetimi
- **Kubernetes manifest analizi** (Deployment, Service, Ingress, ConfigMap, Secret)
- Bağımlılık grafiği görselleştirmesi
- MCP Sunucusu — **40 tool** ile AI asistanları için
- React Flow ile interaktif dashboard
- **TTL tabanlı cache mekanizması** ile performans optimizasyonu
- **Structured logging** (JSON format desteği)
- Port çakışma tespiti
- CI/CD pipeline analizi (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- Git geçmiş zaman yolculuğu — mimari evrim analizi
- AI mimari inceleme — LLM ile otomatik inceleme
- Veritabanı şema parsing (Prisma, TypeORM, Drizzle, Sequelize, SQLAlchemy)
- Reverse proxy analizi (Traefik, Nginx, Caddy)
- API gateway tespiti
- Ortam değişkeni kapsam analizi
- AI model VRAM gereksinimleri hesaplama
- Donanım cihaz tespiti (Serial, USB, GPIO)

## Hızlı Başlangıç

```bash
# Kurulum
npm install -g local-architecturer

# Proje analizi
arch-viz analyze -p /path/to/project

# Web dashboard
arch-viz serve -p /path/to/project

# MCP sunucusu (AI asistanları için)
arch-viz mcp -p /path/to/project

# AI mimari inceleme
arch-viz review -p /path/to/project --provider ollama --model qwen2.5
```

## İstatistikler

| Metrik | Değer |
|--------|-------|
| Test Sayısı | 132 |
| MCP Tool Sayısı | 40 |
| Parser Sayısı | 28 |
| API Endpoint Sayısı | 18 |
| Frontend Component | 12 |

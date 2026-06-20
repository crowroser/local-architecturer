# MCP Server

Model Context Protocol (MCP) sunucusu, AI asistanlarının (Cursor, Windsurf vb.) projenizi analiz etmesini sağlar. 39 tool ile kapsamlı proje analizi sunar.

## Başlatma

```bash
arch-viz mcp -p /path/to/project

# HTTP transport ile
arch-viz mcp -p . -t http -port 3001
```

## Tools

### Core Analysis

#### analyze_project

Tam proje analizi yapar.

```json
{
  "name": "analyze_project",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### get_packages

Workspace paketlerini getirir.

```json
{
  "name": "get_packages",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### get_monorepo_graph

Monorepo bağımlılık grafiğini JSON veya Mermaid formatında getirir.

```json
{
  "name": "get_monorepo_graph",
  "arguments": {
    "format": "both",
    "path": "/optional/project/path"
  }
}
```

#### get_dependency_graph

Bağımlılık grafiğini filtrelenmiş olarak getirir.

```json
{
  "name": "get_dependency_graph",
  "arguments": {
    "type": "all",
    "path": "/optional/project/path"
  }
}
```

#### get_node_details

Belirli bir node'un detaylarını getirir.

```json
{
  "name": "get_node_details",
  "arguments": {
    "nodeId": "@app/core",
    "path": "/optional/project/path"
  }
}
```

#### get_health_score

Proje sağlık skorunu hesaplar.

```json
{
  "name": "get_health_score",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### search_packages

Paketleri ada göre arar.

```json
{
  "name": "search_packages",
  "arguments": {
    "query": "core",
    "path": "/optional/project/path"
  }
}
```

#### detect_circular_dependencies

Döngüsel bağımlılıkları tespit eder.

```json
{
  "name": "detect_circular_dependencies",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### Docker

#### get_docker_services

Docker servislerini port conflict ve volume analizi ile getirir.

```json
{
  "name": "get_docker_services",
  "arguments": {
    "includeAnalysis": true,
    "path": "/optional/project/path"
  }
}
```

#### analyze_dockerfile

Tek bir Dockerfile'ı analiz eder.

```json
{
  "name": "analyze_dockerfile",
  "arguments": {
    "path": "Dockerfile",
    "projectPath": "/optional/project/path"
  }
}
```

#### audit_docker_security

Docker servislerini güvenlik açısından denetler.

```json
{
  "name": "audit_docker_security",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### parse_docker_compose_file

Tek bir Docker Compose dosyasını analiz eder.

```json
{
  "name": "parse_docker_compose_file",
  "arguments": {
    "filePath": "docker-compose.yml",
    "projectPath": "/optional/project/path"
  }
}
```

#### detect_port_conflicts

Port çakışmalarını tespit eder.

```json
{
  "name": "detect_port_conflicts",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### Database & Proxy

#### get_database_schemas

Veritabanı şemalarını parse eder (Prisma, TypeORM, Drizzle, Sequelize, SQLAlchemy).

```json
{
  "name": "get_database_schemas",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### get_proxy_configurations

Reverse proxy yapılandırmalarını getirir (Traefik, Nginx, Caddy).

```json
{
  "name": "get_proxy_configurations",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### parse_nginx_config

Nginx konfigürasyon dosyalarını parse eder.

```json
{
  "name": "parse_nginx_config",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### detect_gateways

API gateway ve reverse proxy'leri tespit eder.

```json
{
  "name": "detect_gateways",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### get_routes_edges

Proxy routing bağımlılık kenarlarını üretir.

```json
{
  "name": "get_routes_edges",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### CI/CD & Git

#### get_ci_cd_pipelines

CI/CD pipeline yapılandırmalarını getirir.

```json
{
  "name": "get_ci_cd_pipelines",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### get_build_edges

CI build bağımlılık kenarlarını üretir.

```json
{
  "name": "get_build_edges",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### time_travel

Git geçmişinden mimari evrimi analiz eder.

```json
{
  "name": "time_travel",
  "arguments": {
    "commits": 100,
    "path": "/optional/project/path"
  }
}
```

### Environment & Security

#### get_env_coverage

Env değişken eşleşmesini analiz eder.

```json
{
  "name": "get_env_coverage",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### analyze_env_file

Tek bir .env dosyasını parse eder.

```json
{
  "name": "analyze_env_file",
  "arguments": {
    "filePath": ".env",
    "projectPath": "/optional/project/path"
  }
}
```

#### get_security_boundaries

Güvenlik sınırlarını analiz eder.

```json
{
  "name": "get_security_boundaries",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### AI & Hardware

#### review_architecture

AI ile mimari inceleme yapar.

```json
{
  "name": "review_architecture",
  "arguments": {
    "provider": "ollama",
    "model": "qwen2.5",
    "baseUrl": "http://localhost:11434",
    "apiKey": "optional-key",
    "path": "/optional/project/path"
  }
}
```

#### get_ai_profile

AI model profili ve VRAM gereksinimlerini getirir.

```json
{
  "name": "get_ai_profile",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### lookup_ai_model

AI model VRAM gereksinimlerini sorgular.

```json
{
  "name": "lookup_ai_model",
  "arguments": {
    "modelName": "llama-3-8b"
  }
}
```

veya parametre sayısından tahmin:

```json
{
  "name": "lookup_ai_model",
  "arguments": {
    "paramsBillion": 7
  }
}
```

#### get_hardware_devices

Hardware cihazları tespit eder.

```json
{
  "name": "get_hardware_devices",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### Data Flow & Visualization

#### get_data_flows

Data flow pipeline'larını getirir.

```json
{
  "name": "get_data_flows",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### analyze_dataflow_bottlenecks

DataFlow darboğazlarını analiz eder.

```json
{
  "name": "analyze_dataflow_bottlenecks",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### get_mermaid_diagram

Mermaid diyagram üretir.

```json
{
  "name": "get_mermaid_diagram",
  "arguments": {
    "variant": "subgraph",
    "path": "/optional/project/path"
  }
}
```

### Language Support

#### parse_python_dependencies

Python bağımlılıklarını parse eder.

```json
{
  "name": "parse_python_dependencies",
  "arguments": {
    "file": "requirements.txt",
    "path": "/optional/project/path"
  }
}
```

#### parse_composer_packages

PHP/Composer bağımlılıklarını parse eder.

```json
{
  "name": "parse_composer_packages",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### parse_workspace_config

Monorepo workspace yapılandırmasını tespit eder.

```json
{
  "name": "parse_workspace_config",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### parse_sequelize_models

Sequelize ORM model dosyalarını parse eder.

```json
{
  "name": "parse_sequelize_models",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

#### parse_sqlalchemy_models

SQLAlchemy ORM model dosyalarını parse eder.

```json
{
  "name": "parse_sqlalchemy_models",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

## Cursor/Windsurf Entegrasyonu

### Cursor

1. Settings > MCP Servers bölümüne gidin
2. Yeni sunucu ekleyin:
   ```json
   {
     "name": "local-architecturer",
     "command": "arch-viz",
     "args": ["mcp", "-p", "/path/to/your/project"]
   }
   ```

### Windsurf

1. Settings > MCP Servers bölümüne gidin
2. Yeni sunucu ekleyin:
   ```json
   {
     "name": "local-architecturer",
     "command": "arch-viz mcp -p /path/to/your/project"
   }
   ```

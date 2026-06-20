# MCP Sunucusu

Model Context Protocol (MCP) sunucusu, AI asistanlarının (Cursor, Windsurf vb.) projenizi analiz etmesini sağlar. 39 tool ile kapsamlı proje analizi sunar.

## Başlatma

```bash
arch-viz mcp -p /path/to/project

# HTTP transport ile
arch-viz mcp -p . -t http -port 3001
```

## Araçlar

### Çekirdek Analiz

#### analyze_project

Tam proje analizi yapar.

```json
{
  "name": "analyze_project",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_packages

Workspace paketlerini getirir.

```json
{
  "name": "get_packages",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_health_score

Proje sağlık skorunu hesaplar.

```json
{
  "name": "get_health_score",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### detect_circular_dependencies

Döngüsel bağımlılıkları tespit eder.

```json
{
  "name": "detect_circular_dependencies",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
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
    "projectPath": "/isteğe bağlı/proje/yolu"
  }
}
```

#### audit_docker_security

Docker servislerini güvenlik açısından denetler.

```json
{
  "name": "audit_docker_security",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "projectPath": "/isteğe bağlı/proje/yolu"
  }
}
```

#### detect_port_conflicts

Port çakışmalarını tespit eder.

```json
{
  "name": "detect_port_conflicts",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

### Veritabanı ve Proxy

#### get_database_schemas

Veritabanı şemalarını parse eder (Prisma, TypeORM, Drizzle, Sequelize, SQLAlchemy).

```json
{
  "name": "get_database_schemas",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_proxy_configurations

Reverse proxy yapılandırmalarını getirir (Traefik, Nginx, Caddy).

```json
{
  "name": "get_proxy_configurations",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### parse_nginx_config

Nginx konfigürasyon dosyalarını parse eder.

```json
{
  "name": "parse_nginx_config",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### detect_gateways

API gateway ve reverse proxy'leri tespit eder.

```json
{
  "name": "detect_gateways",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_routes_edges

Proxy routing bağımlılık kenarlarını üretir.

```json
{
  "name": "get_routes_edges",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

### CI/CD ve Git

#### get_ci_cd_pipelines

CI/CD pipeline yapılandırmalarını getirir.

```json
{
  "name": "get_ci_cd_pipelines",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_build_edges

CI build bağımlılık kenarlarını üretir.

```json
{
  "name": "get_build_edges",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

### Ortam ve Güvenlik

#### get_env_coverage

Env değişken eşleşmesini analiz eder.

```json
{
  "name": "get_env_coverage",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "projectPath": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_security_boundaries

Güvenlik sınırlarını analiz eder.

```json
{
  "name": "get_security_boundaries",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

### AI ve Donanım

#### review_architecture

AI ile mimari inceleme yapar.

```json
{
  "name": "review_architecture",
  "arguments": {
    "provider": "ollama",
    "model": "qwen2.5",
    "baseUrl": "http://localhost:11434",
    "apiKey": "isteğe bağlı-anahtar",
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### get_ai_profile

AI model profili ve VRAM gereksinimlerini getirir.

```json
{
  "name": "get_ai_profile",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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

Donanım cihazları tespit eder.

```json
{
  "name": "get_hardware_devices",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

### Veri Akışı ve Görselleştirme

#### get_data_flows

Data flow pipeline'larını getirir.

```json
{
  "name": "get_data_flows",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### analyze_dataflow_bottlenecks

DataFlow darboğazlarını analiz eder.

```json
{
  "name": "analyze_dataflow_bottlenecks",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
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
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

### Dil Desteği

#### parse_python_dependencies

Python bağımlılıklarını parse eder.

```json
{
  "name": "parse_python_dependencies",
  "arguments": {
    "file": "requirements.txt",
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### parse_composer_packages

PHP/Composer bağımlılıklarını parse eder.

```json
{
  "name": "parse_composer_packages",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### parse_workspace_config

Monorepo workspace yapılandırmasını tespit eder.

```json
{
  "name": "parse_workspace_config",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### parse_sequelize_models

Sequelize ORM model dosyalarını parse eder.

```json
{
  "name": "parse_sequelize_models",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

#### parse_sqlalchemy_models

SQLAlchemy ORM model dosyalarını parse eder.

```json
{
  "name": "parse_sqlalchemy_models",
  "arguments": {
    "path": "/isteğe bağlı/proje/yolu"
  }
}
```

## Cursor/Windsurf Entegrasyonu

### Cursor

1. Ayarlar > MCP Sunucuları bölümüne gidin
2. Yeni sunucu ekleyin:
   ```json
   {
     "name": "local-architecturer",
     "command": "arch-viz",
     "args": ["mcp", "-p", "/projenizin/yolu"]
   }
   ```

### Windsurf

1. Ayarlar > MCP Sunucuları bölümüne gidin
2. Yeni sunucu ekleyin:
   ```json
   {
     "name": "local-architecturer",
     "command": "arch-viz mcp -p /projenizin/yolu"
   }
   ```

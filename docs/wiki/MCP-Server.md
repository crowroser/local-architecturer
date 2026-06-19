# MCP Server

Model Context Protocol (MCP) sunucusu, AI asistanlarının (Cursor, Windsurf vb.) projenizi analiz etmesini sağlar.

## Başlatma

```bash
arch-viz mcp -p /path/to/project
```

## Tools

### analyze_project

Tam proje analizi yapar.

```json
{
  "name": "analyze_project",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### get_packages

Workspace paketlerini getirir.

```json
{
  "name": "get_packages",
  "arguments": {
    "path": "/optional/project/path"
  }
}
```

### get_monorepo_graph

Monorepo bağımlılık grafiğini JSON veya Mermaid formatında getirir.

```json
{
  "name": "get_monorepo_graph",
  "arguments": {
    "format": "both",  // "json" | "mermaid" | "both"
    "path": "/optional/project/path"
  }
}
```

### get_docker_services

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

### get_node_details

Belirli bir node'un detaylarını getirir.

```json
{
  "name": "get_node_details",
  "arguments": {
    "nodeId": "@app/core",  // veya "web", "api" vb.
    "path": "/optional/project/path"
  }
}
```

### get_dependency_graph

Bağımlılık grafiğini filtrelenmiş olarak getirir.

```json
{
  "name": "get_dependency_graph",
  "arguments": {
    "type": "all",  // "all" | "packages" | "services"
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

# API Reference

REST API endpoint'leri.

## Base URL

```
http://localhost:4000
```

## Endpoints

### GET /api/health

Sağlık kontrolü.

**Response:**
```json
{
  "status": "ok",
  "projectPath": "/path/to/project"
}
```

### GET /api/graph

Bağımlılık grafiğini getirir.

**Response:**
```json
{
  "nodes": [
    {
      "id": "@app/core",
      "type": "package",
      "name": "@app/core",
      "metadata": {}
    }
  ],
  "edges": [
    {
      "source": "@app/ui",
      "target": "@app/core",
      "type": "depends"
    }
  ],
  "metadata": {
    "name": "my-project",
    "rootDir": "/path/to/project",
    "packageCount": 3,
    "dockerServiceCount": 4
  }
}
```

### GET /api/packages

Workspace paketlerini getirir.

**Response:**
```json
[
  {
    "name": "@app/core",
    "version": "1.0.0",
    "path": "packages/core/package.json",
    "dependencies": ["lodash"],
    "devDependencies": ["typescript"]
  }
]
```

### GET /api/docker

Docker servislerini analiz ile getirir.

**Response:**
```json
{
  "services": [
    {
      "name": "web",
      "image": "nginx:alpine",
      "ports": ["80:80"],
      "volumes": [],
      "dependsOn": ["api"],
      "networks": ["frontend"]
    }
  ],
  "portConflicts": [
    {
      "port": "80",
      "services": ["web", "api"]
    }
  ],
  "volumes": [
    {
      "source": "./src",
      "target": "/app/src",
      "service": "api",
      "readOnly": false,
      "isLocalPath": true
    }
  ],
  "networks": ["frontend", "backend"],
  "summary": {
    "totalServices": 4,
    "totalPorts": 5,
    "totalVolumes": 3,
    "totalNetworks": 2
  }
}
```

### GET /api/analyze

Tam proje analizini getirir.

**Response:**
```json
{
  "rootDir": "/path/to/project",
  "name": "my-project",
  "packages": [...],
  "dockerConfigs": [...],
  "dependencies": {
    "nodes": [...],
    "edges": [...]
  }
}
```

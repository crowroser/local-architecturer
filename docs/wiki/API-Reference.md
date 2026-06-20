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

### GET /api/circular

Döngüsel bağımlılıkları tespit eder.

**Response:**
```json
{
  "hasCircularDependencies": true,
  "totalCycles": 2,
  "affectedPackages": ["@app/core", "@app/utils"],
  "cycles": [
    {
      "path": ["@app/core", "@app/utils", "@app/core"],
      "edgeCount": 2
    }
  ]
}
```

### GET /api/docker-audit

Docker güvenlik denetimi yapar.

**Response:**
```json
{
  "score": 75,
  "issues": [
    {
      "severity": "warning",
      "message": "Service 'web' has no resource limits",
      "service": "web"
    }
  ],
  "deployIssues": [...]
}
```

### GET /api/env-coverage

Env değişken eşleşmesini analiz eder.

**Response:**
```json
{
  "definedInEnv": ["DATABASE_URL", "API_KEY"],
  "usedInCode": ["DATABASE_URL", "API_KEY", "REDIS_URL"],
  "missingInEnv": ["REDIS_URL"],
  "unusedInCode": []
}
```

### GET /api/ai-profile

AI model profili getirir.

**Response:**
```json
{
  "models": [
    {
      "name": "llama-3-8b",
      "vramGB": 18,
      "service": "llm-service"
    }
  ],
  "totalVramGB": 18
}
```

### GET /api/history

Git geçmişini tarar.

**Query Parameters:**
- `commits` (optional): Taranacak commit sayısı (varsayılan: 100)

**Response:**
```json
[
  {
    "commitHash": "abc12345",
    "timestamp": "2024-01-15T10:30:00Z",
    "message": "feat: add new service",
    "author": "developer",
    "packages": [...],
    "services": [...],
    "packageCount": 5,
    "serviceCount": 3
  }
]
```

### GET /api/history/:commit

Tek bir commit'in anlık görüntüsünü getirir.

**Response:**
```json
{
  "commitHash": "abc12345",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "feat: add new service",
  "author": "developer",
  "packages": [...],
  "services": [...],
  "packageCount": 5,
  "serviceCount": 3
}
```

### GET /api/pipelines

CI/CD pipeline yapılandırmalarını getirir.

**Response:**
```json
[
  {
    "platform": "github-actions",
    "name": "CI",
    "file": ".github/workflows/ci.yml",
    "triggers": ["push", "pull_request"],
    "jobs": [
      {
        "name": "build",
        "steps": [
          { "name": "Install", "action": "actions/checkout" },
          { "name": "Build", "command": "npm run build" }
        ],
        "needs": [],
        "runsOn": "ubuntu-latest"
      }
    ]
  }
]
```

### GET /api/database

Veritabanı şemalarını getirir.

**Response:**
```json
[
  {
    "name": "schema",
    "platform": "prisma",
    "file": "prisma/schema.prisma",
    "tables": [
      {
        "name": "User",
        "columns": [
          {
            "name": "id",
            "type": "Int",
            "isPrimaryKey": true,
            "isNullable": false,
            "isUnique": true
          }
        ]
      }
    ],
    "relations": [...]
  }
]
```

### GET /api/proxy

Reverse proxy yapılandırmalarını getirir.

**Response:**
```json
[
  {
    "platform": "nginx",
    "routes": [
      {
        "domain": "api.example.com",
        "port": "443",
        "targetService": "api",
        "tls": true,
        "stripPrefix": "/api"
      }
    ]
  }
]
```

### GET /api/dataflow

Data flow pipeline'larını getirir.

**Response:**
```json
[
  {
    "name": "user-registration",
    "description": "User registration flow",
    "steps": [
      { "name": "input", "type": "input", "service": "api" },
      { "name": "process", "type": "process", "service": "worker" },
      { "name": "output", "type": "output", "service": "notification" }
    ],
    "triggers": ["POST /api/users"]
  }
]
```

### GET /api/security-boundaries

Güvenlik sınırlarını analiz eder.

**Response:**
```json
{
  "riskyVolumes": [
    {
      "source": "/var/run/docker.sock",
      "target": "/var/run/docker.sock",
      "service": "docker-proxy",
      "risk": "high"
    }
  ],
  "privilegedServices": ["docker-proxy"],
  "summary": {
    "totalVolumes": 10,
    "riskyVolumes": 1,
    "privilegedServices": 1
  }
}
```

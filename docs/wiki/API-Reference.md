# API Referansı

REST API endpoint'leri.

## Temel URL

```
http://localhost:4000
```

## Endpoint'ler

### GET /api/health

Sağlık kontrolü.

**Yanıt:**
```json
{
  "status": "ok",
  "projectPath": "/path/to/project"
}
```

### GET /api/graph

Bağımlılık grafiğini getirir.

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Sorgu Parametreleri:**
- `commits` (isteğe bağlı): Taranacak commit sayısı (varsayılan: 100)

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

**Yanıt:**
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

### GET /api/kubernetes

Kubernetes manifestlerini analiz eder (Deployment, Service, Ingress, ConfigMap, Secret).

**Yanıt:**
```json
{
  "analysis": {
    "deployments": [
      {
        "kind": "Deployment",
        "name": "web-app",
        "namespace": "production",
        "replicas": 3,
        "containers": [
          {
            "name": "web",
            "image": "nginx:latest",
            "ports": [80],
            "env": {}
          }
        ]
      }
    ],
    "services": [
      {
        "kind": "Service",
        "name": "web-service",
        "serviceType": "ClusterIP",
        "ports": [
          {
            "name": "http",
            "port": 80,
            "targetPort": 8080,
            "protocol": "TCP"
          }
        ]
      }
    ],
    "ingresses": [...],
    "configMaps": [...],
    "secrets": [...],
    "connections": [
      {
        "from": "web-service",
        "to": "web-app",
        "type": "service-to-deployment"
      }
    ]
  },
  "graph": {
    "nodes": [...],
    "edges": [...]
  },
  "summary": {
    "deployments": 1,
    "services": 1,
    "ingresses": 0,
    "configMaps": 0,
    "secrets": 0,
    "connections": 1
  }
}
```

### POST /api/cache/invalidate

Cache'i temizler.

**Yanıt:**
```json
{
  "status": "ok",
  "message": "Cache invalidated"
}
```

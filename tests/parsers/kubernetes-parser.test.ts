import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KubernetesParser } from '../../src/parsers/kubernetes-parser.js';
import { PathResolver } from '../../src/core/path-resolver.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

describe('KubernetesParser', () => {
  let parser: KubernetesParser;
  let resolver: PathResolver;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kubernetes-parser-test-'));
    resolver = new PathResolver(tempDir);
    parser = new KubernetesParser(resolver);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return empty analysis when no K8s files exist', async () => {
    const result = await parser.parseAll();
    expect(result.deployments).toEqual([]);
    expect(result.services).toEqual([]);
    expect(result.ingresses).toEqual([]);
    expect(result.configMaps).toEqual([]);
    expect(result.secrets).toEqual([]);
    expect(result.connections).toEqual([]);
  });

  it('should parse Deployment manifest', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'deployment.yaml'),
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  labels:
    app: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 80`
    );

    const result = await parser.parseAll();
    expect(result.deployments.length).toBe(1);
    expect(result.deployments[0].name).toBe('web-app');
    expect(result.deployments[0].namespace).toBe('production');
    expect(result.deployments[0].replicas).toBe(3);
    expect(result.deployments[0].containers.length).toBe(1);
    expect(result.deployments[0].containers[0].image).toBe('nginx:latest');
  });

  it('should parse Service manifest', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'service.yaml'),
      `apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - name: http
    port: 80
    targetPort: 8080`
    );

    const result = await parser.parseAll();
    expect(result.services.length).toBe(1);
    expect(result.services[0].name).toBe('web-service');
    expect(result.services[0].serviceType).toBe('ClusterIP');
    expect(result.services[0].ports.length).toBe(1);
    expect(result.services[0].ports[0].port).toBe(80);
    expect(result.services[0].ports[0].targetPort).toBe(8080);
  });

  it('should parse Ingress manifest', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'ingress.yaml'),
      `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80`
    );

    const result = await parser.parseAll();
    expect(result.ingresses.length).toBe(1);
    expect(result.ingresses[0].name).toBe('web-ingress');
    expect(result.ingresses[0].rules.length).toBe(1);
    expect(result.ingresses[0].rules[0].host).toBe('example.com');
    expect(result.ingresses[0].rules[0].paths[0].serviceName).toBe('web-service');
  });

  it('should parse ConfigMap manifest', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'configmap.yaml'),
      `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: postgres://db:5432/mydb
  LOG_LEVEL: info`
    );

    const result = await parser.parseAll();
    expect(result.configMaps.length).toBe(1);
    expect(result.configMaps[0].name).toBe('app-config');
    expect(result.configMaps[0].data['DATABASE_URL']).toBe('postgres://db:5432/mydb');
  });

  it('should parse Secret manifest', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'secret.yaml'),
      `apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
data:
  API_KEY: c2VjcmV0LWtleQ==
  DB_PASSWORD: cGFzc3dvcmQ=`
    );

    const result = await parser.parseAll();
    expect(result.secrets.length).toBe(1);
    expect(result.secrets[0].name).toBe('app-secret');
    expect(result.secrets[0].type).toBe('Opaque');
    expect(result.secrets[0].keys).toContain('API_KEY');
    expect(result.secrets[0].keys).toContain('DB_PASSWORD');
  });

  it('should detect connections between resources', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'all.yaml'),
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:latest
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
  - port: 80`
    );

    const result = await parser.parseAll();
    expect(result.connections.length).toBe(1);
    expect(result.connections[0].from).toBe('web-service');
    expect(result.connections[0].to).toBe('web-app');
    expect(result.connections[0].type).toBe('service-to-deployment');
  });

  it('should parse multi-document YAML files', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'combined.yaml'),
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: node:20
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api
  ports:
  - port: 3000`
    );

    const result = await parser.parseAll();
    expect(result.deployments.length).toBe(1);
    expect(result.services.length).toBe(1);
    expect(result.connections.length).toBe(1);
  });

  it('should convert to graph nodes', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'deployment.yaml'),
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:latest`
    );

    const analysis = await parser.parseAll();
    const nodes = parser.toGraphNodes(analysis);
    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('k8s-deployment-web-app');
    expect(nodes[0].type).toBe('service');
  });

  it('should convert to graph edges', async () => {
    await fs.mkdir(path.join(tempDir, 'k8s'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'k8s', 'all.yaml'),
      `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:latest
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
  - port: 80`
    );

    const analysis = await parser.parseAll();
    const edges = parser.toGraphEdges(analysis);
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe('k8s-service-web-service');
    expect(edges[0].target).toBe('k8s-deployment-web-app');
    expect(edges[0].type).toBe('network');
  });
});

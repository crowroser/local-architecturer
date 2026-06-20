# Web Dashboard

React Flow kullanılan interaktif grafik görünümü.

## Başlatma

```bash
arch-viz serve -p /path/to/project
```

Tarayıcınız otomatik olarak `http://localhost:4000` adresine yönlendirilecektir.

## Özellikler

### Node Tipleri

- **Package Node'ları** (📦 Mavi): Monorepo paketleri
- **Service Node'ları** (🐳 Yeşil): Docker servisleri
- **Hardware Node'ları** (⚡ Sarı): Donanım cihazları (Serial, USB, GPIO)
- **Database Node'ları** (📁 Mor): Volume ve veritabanı bağlantıları
- **Gateway Node'ları** (🌐 Turuncu): API gateway ve reverse proxy

### Edge Tipleri

- **Depends** (Mavi ok): Bağımlılık ilişkisi
- **Network** (Yeşil çizgi): Network bağlantısı (animated)
- **Volume** (Mor çizgi): Volume bağlantısı (animated)
- **Connects** (Sarı çizgi): Donanım bağlantısı (animated)
- **Routes** (Turuncu çizgi): Proxy routing ilişkisi

### Paneller

- **FilterPanel**: Node ve edge filtreleme
- **DetailPanel**: Seçili node'un detayları
- **TimelineSlider**: Git geçmişinden zaman yolculuğu
- **PipelineView**: CI/CD pipeline görünümü
- **ProfilerPanel**: AI model profilleri
- **DatabasePanel**: Veritabanı şemaları
- **ProxyView**: Reverse proxy yapılandırmaları
- **DataFlowView**: Data flow pipeline'ları
- **SecurityPanel**: Güvenlik sınırları

### Controls

- **MiniMap**: Sol alt köşede mini harita
- **Controls**: Sağ alt köşede zoom ve fit-to-screen butonları
- **Zoom**: Mouse wheel ile zoom
- **Pan**: Sürükleme ile kaydırma
- **ThemeToggle**: Dark/Light tema değiştirme

## API Endpoints

Dashboard aşağıdaki API endpoint'lerini kullanır:

- `GET /api/graph` - Ana grafik verisi
- `GET /api/circular` - Döngüsel bağımlılıklar
- `GET /api/packages` - Paket detayları
- `GET /api/docker` - Docker analizi
- `GET /api/history` - Git geçmişi
- `GET /api/pipelines` - CI/CD pipeline'ları
- `GET /api/ai-profile` - AI model profilleri
- `GET /api/database` - Veritabanı şemaları
- `GET /api/proxy` - Proxy yapılandırmaları
- `GET /api/dataflow` - Data flow pipeline'ları
- `GET /api/security-boundaries` - Güvenlik sınırları

## Customization

### Node Renkleri

```typescript
// NodeTypes.tsx içinde
const nodeColors = {
  package: '#3b82f6',  // Mavi
  service: '#10b981',  // Yeşil
  hardware: '#F59E0B', // Sarı
  database: '#6366f1', // Mor
  gateway: '#f97316',  // Turuncu
};
```

### Edge Renkleri

```typescript
// GraphView.tsx içinde
const edgeColors = {
  depends: '#3b82f6',  // Mavi
  network: '#10b981',  // Yeşil
  volume: '#6366f1',   // Mor
  connects: '#F59E0B', // Sarı
  routes: '#f97316',   // Turuncu
};
```

## Development

```bash
cd frontend
npm install
npm run dev
```

Bu modda Vite hot-reload desteği ile çalışır.

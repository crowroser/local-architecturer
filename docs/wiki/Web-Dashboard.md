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

### Edge Tipleri

- **Depends** (Mavi ok): Bağımlılık ilişkisi
- **Network** (Yeşil çizgi): Network bağlantısı (animated)

### Controls

- **MiniMap**: Sol alt köşede mini harita
- **Controls**: Sağ alt köşede zoom ve fit-to-screen butonları
- **Zoom**: Mouse wheel ile zoom
- **Pan**: Sürükleme ile kaydırma

## API Endpoints

Dashboard aşağıdaki API endpoint'lerini kullanır:

- `GET /api/graph` - Ana grafik verisi
- `GET /api/packages` - Paket detayları
- `GET /api/docker` - Docker analizi

## Customization

### Node Renkleri

```typescript
// NodeTypes.tsx içinde
const nodeColors = {
  package: '#3b82f6',  // Mavi
  service: '#10b981',  // Yeşil
};
```

### Edge Renkleri

```typescript
// GraphView.tsx içinde
const edgeColors = {
  depends: '#3b82f6',  // Mavi
  network: '#10b981',  // Yeşil
};
```

## Development

```bash
cd frontend
npm install
npm run dev
```

Bu modda Vite hot-reload desteği ile çalışır.

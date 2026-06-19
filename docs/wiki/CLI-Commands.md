# CLI Commands

## analyze

Proje yapısını analiz eder.

```bash
arch-viz analyze [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Proje kök dizini | `process.cwd()` |
| `-f, --format <format>` | Çıktı formatı (json/text) | `json` |

### Examples

```bash
# JSON çıktısı
arch-viz analyze -p . -f json

# Text çıktısı
arch-viz analyze -p . -f text
```

## serve

Web dashboard sunucusunu başlatır.

```bash
arch-viz serve [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Proje kök dizini | `process.cwd()` |
| `-port, --port <port>` | Sunucu portu | `4000` |
| `-o, --open` | Browser'ı otomatik aç | `true` |

### Examples

```bash
# Varsayılan ayarlarla
arch-viz serve -p .

# Özel port ile
arch-viz serve -p . -port 3000

# Browser açmadan
arch-viz serve -p . -o false
```

## mcp

MCP sunucusunu başlatır (AI asistanları için).

```bash
arch-viz mcp [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Proje kök dizini | `process.cwd()` |
| `-t, --transport <type>` | Transport tipi (stdio/http) | `stdio` |
| `-port, --port <port>` | HTTP portu (http transport için) | `3001` |

### Examples

```bash
#_stdio transport ile
arch-viz mcp -p .

# HTTP transport ile
arch-viz mcp -p . -t http -port 3001
```

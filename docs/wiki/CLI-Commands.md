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
# stdio transport ile
arch-viz mcp -p .

# HTTP transport ile
arch-viz mcp -p . -t http -port 3001
```

## review

AI destekli mimari inceleme yapar.

```bash
arch-viz review [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Proje kök dizini | `process.cwd()` |
| `--provider <provider>` | LLM sağlayıcı (ollama/openrouter/lmstudio) | `ollama` |
| `--model <model>` | Model adı | `qwen2.5` |
| `--base-url <url>` | Özel API base URL | - |
| `--api-key <key>` | OpenRouter API anahtarı | - |

### Examples

```bash
# Ollama ile
arch-viz review -p . --provider ollama --model qwen2.5

# OpenRouter ile
arch-viz review -p . --provider openrouter --model meta-llama/llama-3-8b --api-key YOUR_KEY

# LM Studio ile
arch-viz review -p . --provider lmstudio --base-url http://localhost:1234
```

## time-travel

Git geçmişinden mimari evrimi analiz eder.

```bash
arch-viz time-travel [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Proje kök dizini | `process.cwd()` |
| `-c, --commits <n>` | Taranacak commit sayısı | `100` |
| `-f, --format <format>` | Çıktı formatı (json/text) | `json` |

### Examples

```bash
# Son 50 commit'i JSON olarak
arch-viz time-travel -p . -c 50

# Text çıktısı ile
arch-viz time-travel -p . -c 20 -f text
```

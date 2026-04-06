# tg-session

A Telegram session string generator with QR code login support. This tool helps you generate session strings for Telegram applications.

## Usage

1. Get API Credentials
   - Visit <https://my.telegram.org/>
   - Login with your Telegram account
   - Click on "API Development tools"
   - Create a new application
   - Note down your `API_ID` and `API_HASH`

2. Run Container

```bash
# Basic usage
docker run -it --rm --name tg-session -v "$(pwd)":/app/session aliuq/tg-session

# Debug mode (displays session string in console)
docker run -it --rm --name tg-session -e DEBUG=true aliuq/tg-session

# With API credentials
docker run -it --rm \
  --name tg-session \
  -v "$(pwd)":/app/session \
  -e API_ID=your_api_id \
  -e API_HASH=your_api_hash \
  aliuq/tg-session
```

The generated session string will be saved in `./.session` file.
If your Telegram account has 2FA enabled, the tool will prompt for the password after the QR code is scanned.
The QR code now shows a live countdown in the terminal and will automatically refresh when Telegram marks it as expired.

## Environment Variables

- `API_ID` - Telegram API ID from my.telegram.org
- `API_HASH` - Telegram API Hash from my.telegram.org
- `DEBUG` - Set to "true" to display session string in console (default: false)

## Build Instructions

```bash
# Standard build
docker build -t tg-session .

# Build with buildx
docker buildx build -t tg-session --load .

# Build with detailed progress
docker buildx build --progress=plain -t tg-session --load .
```

## Validation

```bash
# Rebuild the image
docker build -t tg-session .

# Run the local smoke test inside the container image
docker run --rm \
  --entrypoint python \
  -v "$(pwd)":/workspace \
  -w /workspace \
  tg-session \
  smoke_test.py
```

## Security Note

- Keep your API credentials and session string secure
- Never share your session string with others
- When DEBUG mode is enabled, session string will be visible in console

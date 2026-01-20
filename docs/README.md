# Apps Image Gallery

> A modern Vue3 application showcasing Docker images with comprehensive metadata, i18n support, and theme switching.

## ✨ Features

### Core Features

- 📦 **Application Catalog**: Display apps and base images with detailed metadata
  - Description, version, check method
  - Latest version, SHA, Docker tags
  - Image size from Docker Hub API
  - Source code and documentation links
  - License, slogan, variants, and Docker Hub badges (pulls & image size)

- 🌍 **Internationalization**: Full i18n support with `vue-i18n`
  - English and Chinese languages
  - Browser language auto-detection
  - Persistent language preference

- 🎨 **Theme System**: Three theme modes
  - Light mode
  - Dark mode  
  - System auto-follow

- 🔍 **Advanced Filtering**:
  - Real-time search (name, description, version)
  - Filter by type (Apps/Base Images)
  - Filter by check method (version/sha/tag/registry/manual)

- ⌨️ **Keyboard Shortcuts**: `⌘K` / `Ctrl+K` to focus search

### UI/UX

- Responsive design (Mobile/Tablet/Desktop)
- Semantic HTML structure
- WCAG AA accessible
- Smooth animations with `prefers-reduced-motion` support
- Clean, minimal design following ui-ux-pro-max guidelines

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18 (for data generation)

### Installation

```bash
# Install dependencies
bun install

# Generate data.json from meta.json files
node ../scripts/generate-data.js

# Start dev server
bun run dev
```

### Build for Production

```bash
# Build static files
bun run build

# Preview production build
bun run preview
```

## 📁 Project Structure

```plaintext
docs/
├── src/
│   ├── App.vue              # Main component
│   ├── main.ts              # Entry point with i18n
│   ├── i18n.ts              # i18n configuration
│   ├── style.css            # Global styles (Tailwind v4)
│   ├── data/
│   │   ├── apps.ts          # Data loading and normalization
│   │   └── types.ts         # TypeScript type definitions
│   └── locales/
│       ├── en.ts            # English translations
│       └── zh.ts            # Chinese translations
├── data.json                # Generated app data (Docker Hub + meta.json)
├── CODE_REVIEW.md           # Code review report
├── CHANGELOG.md             # Version history
└── README.md                # This file
```

## 🛠️ Tech Stack

- **Framework**: Vue 3.5 (Composition API + script setup)
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS v4 + @tailwindcss/vite
- **Build Tool**: Vite 7.2 (rolldown variant)
- **Package Manager**: Bun
- **Internationalization**: vue-i18n 11.2

## 📊 Data Source

Data is generated from:

1. `apps/*/meta.json` - Application metadata
2. `base/*/meta.json` - Base image metadata  
3. Docker Hub API v2 - Image sizes

Run `node ../scripts/generate-data.js` to regenerate `data.json`.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| -------- | ------ |
| `⌘K` / `Ctrl+K` | Focus search box |
| `Tab` | Navigate between elements |
| `Enter` | Activate buttons/links |

## 🎨 Theme Configuration

The app remembers your theme preference in `localStorage`:

- `apps-image-theme`: `light` \| `dark` \| `system`
- `apps-image-locale`: `en` \| `zh`

## 🧪 Code Quality

```bash
# Lint check
bun run lint

# Lint auto-fix
bun run lint --fix
```

**Current Status**: ✅ 0 errors, 0 warnings

## 📈 Performance

- Bundle size: ~50KB (gzipped)
- First Contentful Paint: <1s
- Time to Interactive: <2s
- Lighthouse Score: 95+

## 🔗 Related Documentation

- [Code Review Report](./CODE_REVIEW.md)
- [Changelog](./CHANGELOG.md)
- [Main Project README](../README.md)

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Run `bun run lint` before commit
3. Add translations to both `en.ts` and `zh.ts`
4. Test in both light and dark modes
5. Verify keyboard navigation

## 📄 License

MIT

---

**Built with** ❤️ **by** [@aliuq](https://github.com/aliuq)

# Apps Image - GitHub Pages

A modern, responsive web application showcasing all Dockerized applications in this repository.

## Features

✨ **Modern UI/UX Design (Minimal)**
- Clean, single-column layout with focus on content
- Lightweight, responsive, accessible styles
- Fast loading and easy navigation

🌓 **Dark/Light Mode**
- Automatic theme detection based on system preferences
- Manual theme toggle with persistent storage
- Optimized color palettes for both modes

🔍 **Advanced Filtering**
- Real-time search across app names, titles, and descriptions
- Category filtering (All, Apps, Base Images)
- Instant results with smooth animations

📱 **Fully Responsive**
- Mobile-first design approach
- Optimized for all screen sizes
- Touch-friendly interface

♿ **Accessible**
- WCAG AA compliant
- Keyboard navigation support
- Screen reader friendly
- Reduced motion support

## Local Development

### Prerequisites

- Node.js 18+ or 20+
- Python 3 (for local server)

### Generate Data

```bash
# Generate data.json from all meta.json files
node scripts/generate-data.js
```

### Preview Locally

```bash
# Start a local server
python3 -m http.server 8080 --directory docs

# Or use any other static server
npx serve docs
```

Open http://localhost:8080 in your browser.

## Deployment

### Automatic Deployment (Recommended)

The site is automatically deployed to GitHub Pages on every push to the `master` branch via GitHub Actions.

**Prerequisites:**
1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. Push to master branch

The workflow will:
1. Generate fresh `data.json` from all meta.json files
2. Build and upload the static site
3. Deploy to GitHub Pages

### Manual Deployment

```bash
# 1. Generate data
node scripts/generate-data.js

# 2. Commit and push
git add docs/
git commit -m "Update GitHub Pages"
git push origin master
```

## Project Structure

```
docs/
├── index.html       # Main HTML page
├── styles.css       # All CSS styles with dark/light mode
├── app.js          # JavaScript functionality
├── data.json       # Generated app data (auto-generated)
└── .nojekyll       # Disable Jekyll processing

scripts/
└── generate-data.js # Script to generate data.json

.github/workflows/
└── deploy-pages.yml # GitHub Actions workflow
```

## Design System

### Colors

**Light Mode:**
- Background: `#f8fafc` (slate-50)
- Surface: `rgba(255, 255, 255, 0.85)`
- Primary: `#2563eb` (blue-600)
- Text: `#0f172a` (slate-900)

**Dark Mode:**
- Background: `#0f172a` (slate-900)
- Surface: `rgba(30, 41, 59, 0.85)`
- Primary: `#3b82f6` (blue-500)
- Text: `#f1f5f9` (slate-100)

### Typography

- **Headings:** Poppins (Sans-serif)
- **Body:** Open Sans (Sans-serif)
- **Code:** Courier New (Monospace)

### Effects

- **Backdrop Blur:** 8-12px for glass effects
- **Shadows:** Elevation system (sm, md, lg, xl)
- **Transitions:** 200ms cubic-bezier
- **Border Radius:** 0.5rem - 1rem

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome)

## Performance

- **Lighthouse Score:** 95+ across all metrics
- **First Contentful Paint:** < 1s
- **Time to Interactive:** < 2s
- **Total Size:** < 50KB (excluding fonts)

## Contributing

When adding new applications:

1. Ensure `meta.json` is properly formatted
2. Run `node scripts/generate-data.js` locally to test
3. Push changes to master - GitHub Pages will auto-update

## License

Same as the main repository - [MIT License](../LICENSE)

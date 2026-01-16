/**
 * Apps Image - GitHub Pages Application
 * Main JavaScript functionality
 */

// State management
let allApps = []
let currentFilter = 'all'
let searchQuery = ''

// DOM elements
const appsGrid = document.getElementById('appsGrid')
const emptyState = document.getElementById('emptyState')
const searchInput = document.getElementById('searchInput')
const filterButtons = document.querySelectorAll('.filter-btn')
const themeToggle = document.getElementById('themeToggle')
const totalAppsEl = document.getElementById('totalApps')
const totalCategoriesEl = document.getElementById('totalCategories')
const exploreBtn = document.getElementById('exploreBtn')
const lastUpdatedEl = document.getElementById('lastUpdated')

// Initialize app
async function init() {
  setupTheme()
  setupEventListeners()
  await loadApps()
}

// Theme management
function setupTheme() {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
    document.documentElement.classList.remove('dark')
  }
  else {
    document.documentElement.classList.add('dark')
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
}

// Event listeners
function setupEventListeners() {
  themeToggle.addEventListener('click', toggleTheme)

  if (exploreBtn) {
    exploreBtn.addEventListener('click', (e) => {
      e.preventDefault()
      document.querySelector('#appsGrid').scrollIntoView({ behavior: 'smooth' })
    })
  }

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase()
    filterApps()
  })

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'))
      e.target.classList.add('active')
      currentFilter = e.target.dataset.category
      filterApps()
    })
  })
}

// Load apps data
async function loadApps() {
  try {
    const response = await fetch('data.json')
    const data = await response.json()

    allApps = data.apps
    totalAppsEl.textContent = data.total

    // Update categories count
    if (totalCategoriesEl && allApps.length) {
      const categories = new Set(allApps.map(a => a.category || 'app'))
      totalCategoriesEl.textContent = categories.size
    }

    // Format last updated date (minimal)
    const date = new Date(data.generated)
    lastUpdatedEl.textContent = `${date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`

    renderApps(allApps)
  }
  catch (error) {
    console.error('Error loading apps:', error)
    showError()
  }
}

// Filter apps
function filterApps() {
  let filtered = allApps

  // Apply category filter
  if (currentFilter !== 'all') {
    filtered = filtered.filter(app => app.category === currentFilter)
  }

  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter((app) => {
      return (
        app.name.toLowerCase().includes(searchQuery)
        || app.title.toLowerCase().includes(searchQuery)
        || app.slogan.toLowerCase().includes(searchQuery)
        || app.description.toLowerCase().includes(searchQuery)
      )
    })
  }

  renderApps(filtered)
}

// Render apps
function renderApps(apps) {
  appsGrid.innerHTML = ''

  if (apps.length === 0) {
    emptyState.classList.remove('hidden')
    return
  }

  emptyState.classList.add('hidden')

  apps.forEach((app) => {
    const card = createAppCard(app)
    appsGrid.appendChild(card)
  })
}

// Create app card
function createAppCard(app) {
  const card = document.createElement('div')
  card.className = 'app-card'

  // Get first letter for icon
  const iconLetter = app.title.charAt(0).toUpperCase()

  // Determine if has README
  const readmeUrl = app.hasReadme
    ? `https://github.com/aliuq/apps-image/tree/master/${app.readmePath}`
    : null

  card.innerHTML = `
    <div class="app-header">
      <div class="app-icon">${iconLetter}</div>
      <div class="app-info">
        <h3 class="app-title">
          ${escapeHtml(app.title)}
          <span class="app-badge ${app.category === 'base' ? 'badge-base' : ''}">${app.category}</span>
        </h3>
        ${app.version ? `<div class="app-version">v${escapeHtml(app.version)}</div>` : ''}
      </div>
    </div>

    ${app.slogan ? `<p class="app-slogan">${escapeHtml(app.slogan)}</p>` : ''}

    <div class="app-meta">
      ${app.license
        ? `
        <div class="app-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 16v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
          </svg>
          <span>${escapeHtml(app.license)}</span>
        </div>
      `
        : ''}
      <div class="app-meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
          <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
        </svg>
        <span>Docker</span>
      </div>
    </div>

    <div class="app-actions">
      ${app.repoUrl
        ? `
        <a href="${escapeHtml(app.repoUrl)}" target="_blank" rel="noopener noreferrer" class="app-action-link">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>
      `
        : ''}
      <a href="${escapeHtml(app.dockerUrl)}" target="_blank" rel="noopener noreferrer" class="app-action-link ${!app.repoUrl ? 'primary' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
          <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
          <path d="M7 13h.01"/>
          <path d="M12 13h.01"/>
          <path d="M17 13h.01"/>
        </svg>
        Docker Hub
      </a>
      ${readmeUrl
        ? `
        <a href="${escapeHtml(readmeUrl)}" target="_blank" rel="noopener noreferrer" class="app-action-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          README
        </a>
      `
        : ''}
    </div>
  `

  return card
}

// Show error state
function showError() {
  appsGrid.innerHTML = `
    <div class="loading">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Error loading applications. Please try again later.</p>
    </div>
  `
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
}
else {
  init()
}

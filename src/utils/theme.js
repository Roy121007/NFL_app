/**
 * Sistema de tema claro/oscuro con persistencia en localStorage
 */

const THEME_KEY = 'nfl-theme-mode';

// Light mode CSS variable overrides
const lightThemeVars = {
  '--bg-dark': '#f0f2f5',
  '--bg-card': '#ffffff',
  '--text-primary': '#1a1a2e',
  '--text-secondary': '#64748b',
  '--border-color': '#e2e8f0',
};

const darkThemeVars = {
  '--bg-dark': '#0f172a',
  '--bg-card': '#1e293b',
  '--text-primary': '#f8fafc',
  '--text-secondary': '#94a3b8',
  '--border-color': '#334155',
};

export function initThemeToggle() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  
  applyTheme(isDark ? 'dark' : 'light');
  return isDark;
}

export function applyTheme(mode) {
  const vars = mode === 'light' ? lightThemeVars : darkThemeVars;
  const root = document.documentElement;
  
  Object.entries(vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
  
  document.body.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
}

export function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

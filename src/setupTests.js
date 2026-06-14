/**
 * Vitest setup file
 * Моки для браузерных API, которые отсутствуют в jsdom.
 */

// Mock для matchMedia (используется в authStore для системной темы)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  })
})

/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    // Используем jsdom для эмуляции браузера
    environment: "jsdom",
    // Глобальные API Vue Test Utils
    globals: true,
    // Путь к тестам
    include: ["src/**/*.{test,spec}.{js,ts}"],
    // Coverage
    coverage: {
      provider: "v8",
      include: ["src/**/*.{vue,js}"],
      exclude: ["src/main.js", "src/**/*.{test,spec}.{js,ts}"],
    },
  },
});

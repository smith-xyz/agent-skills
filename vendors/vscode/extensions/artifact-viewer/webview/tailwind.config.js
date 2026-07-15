const { join } = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, "index.html"),
    join(__dirname, "src", "**", "*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--vscode-editor-background)",
        foreground: "var(--vscode-editor-foreground)",
        border: "var(--vscode-panel-border)",
        accent: "var(--vscode-button-background)",
        "accent-foreground": "var(--vscode-button-foreground)",
        muted: "var(--vscode-descriptionForeground)",
        badge: "var(--vscode-badge-background)",
        "badge-foreground": "var(--vscode-badge-foreground)",
      },
      fontFamily: {
        sans: "var(--vscode-font-family)",
      },
      fontSize: {
        base: "var(--vscode-font-size)",
      },
    },
  },
  plugins: [],
};

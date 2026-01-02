import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Nunito', 'IBM Plex Sans Thai', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Quicksand', 'Prompt', 'IBM Plex Sans Thai', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        orb: {
          calm: "hsl(var(--orb-calm))",
          alert: "hsl(var(--orb-alert))",
          warning: "hsl(var(--orb-warning))",
          emergency: "hsl(var(--orb-emergency))",
        },
        glow: {
          cyan: "hsl(var(--glow-cyan))",
          mint: "hsl(var(--glow-mint))",
          pale: "hsl(var(--glow-pale))",
          warm: "hsl(var(--glow-warm))",
          violet: "hsl(var(--glow-violet))",
          aurora: "hsl(var(--glow-aurora))",
        },
      },
      backgroundImage: {
        "gradient-ambient": "var(--gradient-ambient)",
        "gradient-orb": "var(--gradient-orb)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-sanctuary": "var(--gradient-sanctuary)",
        "gradient-holographic": "var(--gradient-holographic)",
        "gradient-neural": "var(--gradient-neural)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        "glow-cyan": "var(--shadow-glow-cyan)",
        "glow-mint": "var(--shadow-glow-mint)",
        "glow-warm": "var(--shadow-glow-warm)",
        "glow-alert": "var(--shadow-glow-alert)",
        "glow-violet": "var(--shadow-glow-violet)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        "3xl": "1.75rem",
        "4xl": "2rem",
        organic: "60% 40% 30% 70% / 60% 30% 70% 40%",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "morph": {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "25%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "50%": { borderRadius: "50% 60% 30% 70% / 40% 70% 50% 60%" },
          "75%": { borderRadius: "60% 30% 60% 40% / 70% 30% 60% 40%" },
        },
        "ripple": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "holographic": {
          "0%, 100%": { backgroundPosition: "0% 50%", filter: "hue-rotate(0deg)" },
          "50%": { backgroundPosition: "100% 50%", filter: "hue-rotate(15deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "morph": "morph 20s ease-in-out infinite",
        "ripple": "ripple 2s ease-out infinite",
        "shimmer": "shimmer 1.5s infinite",
        "holographic": "holographic 15s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

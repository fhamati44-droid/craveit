/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        tamam: ['Alexandria', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        headline: ['Alexandria', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        body: ['Alexandria', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-lg-mobile': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '1.25', fontWeight: '700' }],
        'headline-sm': ['18px', { lineHeight: '1.3', fontWeight: '700' }],
        'body-md': ['14px', { lineHeight: '1.5' }],
        'body-sm': ['13px', { lineHeight: '1.4' }],
        'label-lg': ['14px', { lineHeight: '1.3', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '1.3' }],
        'label-bold': ['12px', { lineHeight: '1.3', fontWeight: '700' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Brand colors
        blue: { DEFAULT: '#1A73E8', dark: '#1557B0' },
        green: { DEFAULT: '#2DB34A', dark: '#1E8A35' },
        orange: '#FF6B2B',
        tamam: {
          ink: '#071312',
          bg: '#101412',
          'surface-lowest': '#0B0F0D',
          'surface-low': '#181D1A',
          surface: '#1C211E',
          'surface-high': '#262B29',
          'surface-highest': '#313633',
          green: '#6EBF5F',
          'green-bright': '#89DB78',
          'green-light': '#A2F790',
          'green-dark': '#1C6D17',
          teal: '#0E3B40',
          gold: '#EAC45C',
          'gold-dark': '#CCA944',
          cream: '#F4F0E5',
          text: '#DFE3E0',
          'text-muted': '#C0CAB8',
          outline: '#40493C',
          error: '#FFB4AB',
        },
        // Material Design semantic tokens (match uploaded HTML references)
        background: { DEFAULT: '#101412', on: '#dfe3e0' },
        surface: {
          DEFAULT: '#1c211e',
          on: '#dfe3e0',
          variant: '#313633',
          'container-lowest': '#0b0f0d',
          'container-low': '#181d1a',
          'container': '#1c211e',
          'container-high': '#262b29',
          'container-highest': '#313633',
          'bright': '#353a38',
          'dim': '#101412',
        },
        'on-surface': { DEFAULT: '#dfe3e0', variant: '#c0cab8' },
        'inverse-surface': '#dfe3e0',
        'inverse-on-surface': '#2d312f',
        primary: {
          DEFAULT: '#6ebf5f',
          on: '#003a01',
          container: '#1c6d00',
          'on-container': '#98ee78',
        },
        secondary: {
          DEFAULT: '#87db68',
          on: '#042100',
          container: '#1c6d00',
          'on-container': '#98ee78',
        },
        tertiary: {
          DEFAULT: '#eac45c',
          on: '#3d2e00',
          container: '#cca944',
          'on-container': '#3d2e00',
        },
        outline: { DEFAULT: '#8a9484', variant: '#40493c' },
        error: { DEFAULT: '#ffb4ab', on: '#690005', container: '#93000a', 'on-container': '#ffdad6' },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.5s infinite',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.12)',
        'top': '0 -2px 12px rgba(0,0,0,0.08)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    'bg-blue', 'text-blue', 'bg-green', 'text-green',
    'bg-red-500', 'text-red-500', 'bg-orange', 'text-orange',
  ]
}

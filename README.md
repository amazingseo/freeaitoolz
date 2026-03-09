# FreeAIToolz.com

Free AI-powered tools for writing, SEO, and content creation. Built with Astro + React Islands for maximum speed and SEO performance.

## Tech Stack
- **Astro** - Static site generator with island architecture
- **React** - Interactive tool components (loaded only when needed)
- **Tailwind CSS** - Utility-first styling
- **Anthropic Claude API** - Powers AI tools

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deploy to Cloudflare Pages (Free)

1. Push this repo to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Click "Create a project" > "Connect to Git"
4. Select your GitHub repo
5. Set build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
6. Click "Save and Deploy"
7. Add your custom domain (freeaitoolz.com) in Cloudflare Pages settings

## Deploy to Vercel (Alternative)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repo
4. Vercel auto-detects Astro — just click Deploy
5. Add custom domain in Vercel project settings

## Adding New Tools

1. Create a React component in `src/components/tools/YourTool.tsx`
2. Create an Astro page in `src/pages/tools/your-tool.astro`
3. Use `ToolLayout` for automatic SEO, FAQ schema, and breadcrumbs
4. Add `client:visible` to the React component for island loading

## SEO Features
- Server-rendered HTML (zero JS by default)
- Automatic sitemap generation
- JSON-LD schema markup (SoftwareApplication + FAQ + Breadcrumbs)
- Open Graph & Twitter cards
- Canonical URLs
- Semantic HTML structure optimized for AEO

## Project Structure
```
src/
├── layouts/
│   ├── BaseLayout.astro    # Global layout (nav, footer, meta)
│   └── ToolLayout.astro    # Tool-specific layout (schema, FAQs)
├── pages/
│   ├── index.astro         # Homepage
│   └── tools/
│       ├── index.astro     # All tools listing
│       └── ai-humanizer.astro
├── components/
│   └── tools/
│       └── AIHumanizer.tsx # React island component
└── styles/
    └── global.css          # Tailwind + custom styles
```

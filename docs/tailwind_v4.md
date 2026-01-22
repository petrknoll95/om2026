# Tailwind CSS v4 Guide: Key Differences from v3

## Installation

### Using PostCSS (Recommended)
```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

Configure your PostCSS:
```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  }
}
```

### Using Vite
```javascript
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
});
```

### Using Tailwind CLI
CLI is now in a dedicated package:
```bash
npx @tailwindcss/cli -i input.css -o output.css
```

## Major Syntax Changes

### Importing Tailwind
**v3:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**v4:**
```css
@import "tailwindcss";
```

### Creating Custom Utilities
**v3:**
```css
@layer utilities {
  .tab-4 {
    tab-size: 4;
  }
}
```

**v4:**
```css
@utility tab-4 {
  tab-size: 4;
}
```

### Component Utilities
**v3:**
```css
@layer components {
  .btn {
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: ButtonFace;
  }
}
```

**v4:**
```css
@utility btn {
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ButtonFace;
}
```

### CSS Variables in Arbitrary Values
**v3:**
```html
<div class="bg-[--brand-color]"></div>
```

**v4:**
```html
<div class="bg-(--brand-color)"></div>
```

### Container Customization
**v3:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    container: {
      center: true,
      padding: '2rem',
    }
  }
}
```

**v4:**
```css
@utility container {
  margin-inline: auto;
  padding-inline: 2rem;
}
```

### Loading JavaScript Config
**v4:**
```css
@config "../../tailwind.config.js";
```

## Renamed Utilities

| v3 | v4 |
|-----|-----|
| shadow-sm | shadow-xs |
| shadow | shadow-sm |
| drop-shadow-sm | drop-shadow-xs |
| drop-shadow | drop-shadow-sm |
| blur-sm | blur-xs |
| blur | blur-sm |
| backdrop-blur-sm | backdrop-blur-xs |
| backdrop-blur | backdrop-blur-sm |
| rounded-sm | rounded-xs |
| rounded | rounded-sm |
| outline-none | outline-hidden |
| ring | ring-3 |

## Removed Deprecated Utilities

| Deprecated | Replacement |
|-----|-----|
| bg-opacity-* | bg-black/50 (opacity modifiers) |
| text-opacity-* | text-black/50 |
| border-opacity-* | border-black/50 |
| divide-opacity-* | divide-black/50 |
| ring-opacity-* | ring-black/50 |
| placeholder-opacity-* | placeholder-black/50 |
| flex-shrink-* | shrink-* |
| flex-grow-* | grow-* |
| overflow-ellipsis | text-ellipsis |
| decoration-slice | box-decoration-slice |
| decoration-clone | box-decoration-clone |

## Behavior Changes

### Default Colors
- Border and divide utilities now use `currentColor` by default (instead of gray-200)
- Ring utility default color is now `currentColor` (instead of blue-500)
- Placeholder text uses current text color at 50% opacity (instead of gray-400)

### Width and Sizing
- Ring utility width is now 1px by default (was 3px)
- Outline utility sets outline-width: 1px by default

### Variants and Stacking
- Variant stacking order changed from right-to-left to left-to-right:
  - v3: `first:*:pt-0` 
  - v4: `*:first:pt-0`
- Hover variant only applies on devices that support hover (media query: hover: hover)
- Gradients preserve values when overriding with variants

### Space Between Changes
- Space utilities (`space-x-*`, `space-y-*`) use a different selector for better performance
- Consider using flex/grid with gap instead:
  ```html
  <!-- Old -->
  <div class="space-y-4">...</div>
  
  <!-- New recommended approach -->
  <div class="flex flex-col gap-4">...</div>
  ```

## Using Theme Values

### Accessing Theme in CSS
**v3:**
```css
.my-class {
  background-color: theme(colors.red.500);
}
```

**v4:**
```css
.my-class {
  background-color: var(--color-red-500);
}
```

### In Media Queries
**v3:**
```css
@media (min-width: theme(screens.xl)) {
  /* ... */
}
```

**v4:**
```css
@media (width >= theme(--breakpoint-xl)) {
  /* ... */
}
```

## Using Component Frameworks

### Vue, Svelte, or CSS Modules
Import theme definitions without duplicating CSS:

```vue
<style>
  @reference "../../app.css";
  
  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

Or use CSS variables directly:

```vue
<style>
  h1 {
    color: var(--text-red-500);
  }
</style>
```

## Automatic Upgrade

For most projects, you can use the upgrade tool to automate migration:

```bash
npx @tailwindcss/upgrade
```

Prerequisites:
- Node.js 20 or higher
- Run in a new branch and review changes carefully
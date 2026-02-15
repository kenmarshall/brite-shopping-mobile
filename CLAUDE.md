# Brite Shopping Mobile

React Native (Expo) mobile app for the Brite Shopping ecosystem — a price comparison platform for Jamaican shoppers.

## Product Vision
- Help Jamaican shoppers find products, see where they're available, and compare prices
- User sees a product with its estimated/average price, then all store locations with their specific prices
- Stores can be physical locations or online shops accessible to Jamaicans
- Core user flow: search → see product + estimated price → see store locations + their prices → decide

## Key Constraint
- Mobile app ONLY talks to the API (`brite_shopping_api`), never directly to the catalog engine or MongoDB

## Architecture
- Part of 3-repo ecosystem with `brite-shopping-catalog-engine` and `brite_shopping_api`
- All repos at `/Users/kennethmarshall/dev/brite_shopping/`
- API: `https://brite-shopping-api.onrender.com` (production), `http://localhost:5000` (dev)

## Tech Stack
- **Framework**: Expo SDK 54, React Native 0.81, React 19
- **Routing**: Expo Router v6 (file-based, typed routes)
- **Language**: TypeScript (strict)
- **Build**: EAS (Expo Application Services)
- **Testing on device**: Expo Go (SDK 54 compatible)

## Development
- Install: `npm install`
- Start: `npx expo start`
- iOS bundle ID: `com.kenmarshall.briteshopping`

## Current Screens
- **Search (Home)** — unified search bar + category chips + product list
- **Product Detail** — hero image, price comparison across stores, tags, category badge
- **Explore** — placeholder (coming soon)

## API Client
- `services/api.ts` — all API calls (searchProducts, getProduct, getCategories, etc.)
- API_BASE_URL currently points to Render production

## UX Design Principles
Prioritize modern mobile UX best practices. Suggest improvements when they are absent or violated.

- **Search must be forgiving** — support partial matching, typo tolerance, prefix search. Users should see results as they type, not only after typing a complete word.
- **Unified search** — single search bar searches across product names, brands, categories, and tags. Users should never need to know what type of thing they're searching for.
- **Data presentation must be consistent** — product cards show uniform info (name, brand, price, category) without mixing up field types.
- **Progressive disclosure** — most important info first (name, price, store count), details on tap.
- **Feedback on every action** — loading states, empty states, error states with retry.
- **Mobile-first** — touch targets >= 44pt, readable text sizes, scrollable content, no horizontal overflow.
- **Accessibility** — dark/light mode, sufficient contrast, screen reader labels.
- **Performance** — debounce search input (400ms), lazy-load images, paginate long lists.
- **Visual hierarchy** — estimated price is the hero element on product detail. Best price highlighted in green.

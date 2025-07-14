# Frontend Vision for DSG Marketplace

## 1. Brand & Color Palette

- **Primary:** Deep blue (#1A237E) — trust, professionalism
- **Accent:** Vibrant orange (#FF9800) — action, highlights
- **Background:** Light gray (#F5F6FA) — clean, modern
- **Success:** Green (#43A047)
- **Error:** Red (#E53935)
- **Text:** Dark gray (#212121), white for dark backgrounds

## 2. Typography

- **Headings:** Bold, modern sans-serif (e.g., Montserrat, Inter)
- **Body:** Clean sans-serif (e.g., Roboto, Open Sans)

## 3. Layout & Navigation

- **Header:** Logo, search bar, user menu (profile, notifications, logout)
- **Sidebar (desktop):** Quick links (Dashboard, Services, Bookings, Messages, Reviews, Admin)
- **Bottom nav (mobile):** Home, Search, Bookings, Messages, Profile
- **Main area:** Card-based layout for listings, bookings, chat, etc.
- **Footer:** Minimal, with links to legal, help, and contact

## 4. UI/UX Principles

- **Responsive:** Fully mobile-first, adaptive to all screen sizes
- **Accessible:** WCAG 2.1 AA — color contrast, keyboard nav, ARIA labels
- **Feedback:** Toasts/snackbars for actions, loading spinners, skeleton screens
- **Microinteractions:** Button hover, card lift, chat message animation
- **Dark mode:** Optional toggle (see below for details)

## 5. Key Functionalities

- **Authentication:** JWT-based, role-aware login/register flows
- **Service Search:** Advanced filters, geolocation, instant search suggestions
- **Booking System:** Calendar picker, status tracking, cancellation
- **Chat:** Real-time (Socket.io), message read receipts, typing indicators
- **Reviews:** Star ratings, moderation, helpful votes
- **Admin Dashboard:** User/service management, analytics, moderation tools
- **Notifications:** Real-time (Socket.io), badge counts, push-ready

## 6. User Flows

- **Onboarding:** Guided registration, role selection (provider, customer, delivery)
- **Service Discovery:** Search, filter, view details, book
- **Booking Management:** View, update, cancel, review
- **Messaging:** Contextual chat (order-based), admin contact
- **Profile:** Edit info, manage services/bookings, view history

## 7. Inspiration

- **Airbnb:** Clean cards, search UX, booking flow
- **Upwork:** Role-based dashboards, messaging
- **Uber:** Real-time status, map integration

## 8. Tech Stack & Integration

- **Framework:** React (Next.js for SSR/SEO)
- **State:** Redux Toolkit or React Query
- **Styling:** Tailwind CSS or MUI for rapid, accessible design
- **API:** REST (OpenAPI), real-time via Socket.io
- **Testing:** Cypress (E2E), Jest (unit)

## 9. Advanced Features (Future)

- **Map integration:** Geospatial search, provider tracking
- **Payments:** Stripe/PayPal integration
- **PWA:** Installable, offline support
- **Internationalization:** Multi-language support

## 10. Deep Project Structure (Next.js + Tailwind CSS Example)

```
frontend/
├── public/
│   ├── images/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Buttons, Inputs, Modals, Loaders, Toasts
│   │   │   ├── layout/           # Header, Sidebar, Footer, Navbars
│   │   │   ├── cards/            # ServiceCard, BookingCard, ReviewCard
│   │   │   ├── chat/             # ChatWindow, MessageBubble, ChatSidebar
│   │   │   └── ...
│   │   │
│   │   ├── features/
│   │   │   ├── auth/             # Login, Register, AuthContext
│   │   │   ├── services/         # ServiceList, ServiceDetail, SearchBar
│   │   │   ├── bookings/         # BookingList, BookingDetail, Calendar
│   │   │   ├── reviews/          # ReviewList, ReviewForm
│   │   │   ├── admin/            # UserManagement, Analytics, Moderation
│   │   │   └── notifications/    # NotificationBell, NotificationList
│   │   │
│   │   ├── hooks/                # Custom React hooks (useAuth, useSocket, useTheme)
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   ├── _document.tsx
│   │   │   ├── index.tsx         # Home
│   │   │   ├── search.tsx
│   │   │   ├── bookings.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── admin/
│   │   │   │   └── index.tsx
│   │   │   └── ...
│   │   │
│   │   ├── store/                # Redux slices or React Query setup
│   │   ├── styles/               # Tailwind config, global styles
│   │   ├── utils/                # API clients, helpers, validators
│   │   ├── context/              # Theme, Auth, Socket contexts
│   │   └── types/                # TypeScript types/interfaces
│   │
│   ├── .env.local
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── next.config.js
│   ├── package.json
│   └── README.md
```

- **Separation of concerns:** Features, components, and pages are modular.
- **Scalable:** Easy to add new features or pages.
- **Testable:** Each feature/component can have its own tests.

## 11. Dark Mode — Deep Dive

- **Palette:**
  - Background: #181A20
  - Surface: #23272F
  - Text: #F5F6FA
  - Accent: #FFB74D (muted orange)
  - Success: #66BB6A
  - Error: #EF5350
- **Implementation:**
  - Use Tailwind's `dark:` variant or MUI's theme provider.
  - Store user preference in `localStorage` and/or follow system `prefers-color-scheme`.
  - Add a toggle in the header or user menu.
  - Animate transitions for a smooth experience.
  - Ensure all components (cards, modals, chat, etc.) adapt to dark mode.
  - Test color contrast and accessibility in both modes.
- **Example (Tailwind):**
  ```js
  // In _app.tsx or a ThemeProvider
  useEffect(() => {
    const userPref = localStorage.getItem('theme');
    if (userPref) {
      document.documentElement.classList.toggle('dark', userPref === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  ```
  ```html
  <!-- Toggle button -->
  <button onClick={toggleTheme}>
    🌙☀️
  </button>
  ```
- **SVGs/Icons:** Use two-tone or theme-adaptive icons.
- **Charts/Maps:** Ensure theme-aware or provide dark variants.

---

This vision ensures a modern, delightful, and robust user experience, tightly integrated with your backend's advanced features and security.

# Elite Surfing Brasil — Full Stack E-commerce Platform

**Live:** [www.elitesurfing.com.br](https://www.elitesurfing.com.br)

A full-featured e-commerce platform I built from scratch for the Brazilian market. The store sells surf equipment and is handling real customers, real payments (credit card, boleto, and PIX), and real shipping quotes via Melhor Envio. This is the largest project I've built — over 40 components, 12 API route files, and an admin panel with direct sales, blog management, and customer CRM.

---

## Context

I founded Elite Surfing in 2010 as a physical surf brand in Brazil. After moving to Portugal and transitioning into development, I decided to replace the old WordPress/WooCommerce setup with a custom-built platform that I could fully control and extend.

The Brazilian e-commerce landscape has specific requirements that generic platforms handle poorly: PIX payments (instant bank transfer, now the most popular payment method in Brazil), boleto bancário, shipping calculation through Melhor Envio (an aggregator that compares rates across carriers like Correios, Jadlog, and Azul Cargo), and installment pricing (parcelamento) displayed on every product. This project handles all of that.

---

## Tech Stack

**Frontend:** React 19, Vite, React Router, Tailwind CSS, Axios, Swiper, EmailJS, Lucide React, React Hot Toast

**Backend:** Node.js 18, Express, MongoDB Atlas, Mongoose, Stripe (credit cards + boleto), JWT, Bcrypt.js, Cloudinary, Resend (email delivery), Multer

**Integrations:** Melhor Envio API (shipping), Stripe (payments), Cloudinary (images), WhatsApp Business API, Resend (transactional emails)

**Infrastructure:** Vercel (frontend + serverless backend), MongoDB Atlas, Cloudinary CDN

---

## Architecture

The project is a monorepo with separate `client` and `server` directories, each with their own `package.json` and Vercel deployment config.

```
client/
├── src/
│   ├── components/
│   │   ├── blog/              # WSL rankings, schedule, champions
│   │   ├── seller/            # Admin: edit products, shipping labels
│   │   ├── seo/               # JSON-LD structured data, meta tags
│   │   ├── Navbar.jsx
│   │   ├── CartSidebar.jsx    # Slide-out cart drawer
│   │   ├── ShippingCalculator.jsx
│   │   ├── ProductReviews.jsx
│   │   ├── ProductPriceDisplay.jsx  # Handles installment display
│   │   ├── WhatsAppButton.jsx
│   │   └── ... (40+ components)
│   ├── context/
│   │   └── AppContext.jsx     # Global state: cart, auth, products
│   ├── pages/
│   │   ├── seller/            # Admin panel (8 pages)
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── ProductList.jsx
│   │   │   ├── AddProduct.jsx
│   │   │   ├── BlogManager.jsx
│   │   │   ├── Clientes.jsx       # Customer CRM
│   │   │   ├── VendasDiretas.jsx  # Direct sales / romaneio
│   │   │   └── NovoRomaneio.jsx
│   │   ├── Home.jsx
│   │   ├── ProductDetails.jsx
│   │   ├── Cart.jsx
│   │   ├── PixPayment.jsx    # Manual PIX payment flow
│   │   ├── Blog.jsx
│   │   └── ... (18 pages total)
│   └── utils/
│       ├── installmentUtils.js  # Brazilian installment calculation
│       ├── pixUtils.js          # PIX QR code and payment helpers
│       └── shippingUtils.js     # Melhor Envio integration helpers

server/
├── controllers/           # 12 controllers
│   ├── userController.js
│   ├── productController.js
│   ├── orderController.js
│   ├── reviewController.js
│   ├── shippingController.js    # Melhor Envio proxy
│   ├── pixManualController.js   # Manual PIX verification
│   ├── blogController.js
│   ├── clienteController.js     # Customer management
│   ├── romaneioController.js    # Direct sales records
│   └── ...
├── models/                # 8 Mongoose models
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Review.js
│   ├── BlogPost.js
│   ├── Cliente.js
│   ├── Romaneio.js
│   └── Address.js
├── services/
│   ├── emailService.js              # Resend integration
│   ├── melhorEnvioService.js        # Shipping rate calculator
│   ├── adminNotificationService.js  # Order alerts
│   └── whatsappService.js
├── emails/
│   ├── OrderConfirmationEmail.js    # HTML email templates
│   └── OrderStatusUpdateEmail.js
└── server.js
```

---

## Key Features

### Payments — three methods for the Brazilian market

**Stripe (credit card):** Standard Stripe Payment Intents flow with webhook confirmation. Supports installment display on product pages (e.g., "12x de R$24,90") using a custom utility that calculates installment values with interest rates.

**Boleto bancário:** Generated through Stripe's boleto payment method. The customer receives a boleto code and has a few days to pay at any bank or lottery house. The webhook confirms payment asynchronously.

**PIX (manual flow):** Since Stripe's native PIX support wasn't available when I built this, I implemented a manual PIX flow. The customer sees a QR code and payment details on a dedicated `/pix-payment` page. After transferring, the admin verifies the payment manually through the admin panel. Not as automated as I'd like, but it works and PIX is essential for the Brazilian market.

### Shipping — Melhor Envio integration

Melhor Envio is the Brazilian equivalent of a shipping aggregator. The `ShippingCalculator` component lets customers enter their CEP (postal code) and instantly see shipping options with prices and delivery estimates from multiple carriers.

On the backend, `melhorEnvioService.js` handles the API calls to Melhor Envio, calculating rates based on product weight/dimensions and the destination CEP. The admin can also generate shipping labels directly from the orders page.

### Blog — WSL surf content

The platform includes a blog section focused on World Surf League content. The admin can create and manage posts through `BlogManager.jsx`. The blog also has dedicated components for WSL rankings, event schedules, and champion history — this drives organic traffic from surfers searching for WSL content.

### Admin panel — "Vendas Diretas" (direct sales)

Beyond the standard product/order management, the admin panel includes a "Vendas Diretas" (direct sales) system. This is a romaneio system for recording in-person or off-platform sales — useful for tracking inventory and revenue that doesn't go through the website checkout. Each romaneio can be printed via `RomaneioImpressao.jsx`.

There's also a basic CRM (`Clientes.jsx`) for managing customer information outside of registered website users.

### SEO

The project has dedicated SEO components: `JsonLd.jsx` generates structured data (Product, Organization, BreadcrumbList), `SEO.jsx` handles dynamic meta tags per page, and `seoConfig.js` centralizes all SEO settings. There's also a sitemap generator script (`scripts/generate-sitemap.js`) and the site is verified in Google Search Console.

### Other notable features

- **Persistent cart** — Synced between localStorage and server. On login, local items merge with the server-side cart.
- **Verified reviews** — Only purchasers can leave reviews. Tied to order IDs.
- **Guest checkout** — Customers can buy without creating an account.
- **Promo codes** — Percentage discounts with server-side validation.
- **Free shipping threshold** — Configurable minimum order value for free shipping.
- **Product image gallery** — Modal with zoom, powered by Cloudinary CDN.
- **Institutional pages** — FAQ, Privacy Policy, Terms of Service, Refund Policy — all required for Brazilian e-commerce compliance (Código de Defesa do Consumidor).
- **WhatsApp floating button** — Direct link to WhatsApp Business for customer support.
- **Announcement bar** — Configurable top banner for promotions.
- **Email notifications** — Order confirmation and status update emails via Resend (switched from Nodemailer because Vercel blocks SMTP).

---

## Authentication

JWT stored in httpOnly cookies. Two middleware layers:

- `authUser.js` — Validates customer tokens for protected routes (cart, orders, reviews, addresses).
- `authSeller.js` — Admin authentication using environment variable credentials. Simple approach for a single-admin setup.

The frontend uses a custom `usePersistentAuth` hook that checks the auth state on mount and handles token expiration gracefully.

---

## Data models

| Model        | Key fields                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **User**     | name, email, hashed password, cart object                                                                                                 |
| **Product**  | name, description, price, offer price, images (Cloudinary URLs), category, group, stock status, weight/dimensions (for shipping)          |
| **Order**    | user ref, items, amounts (original/discount/final), promo code, address, payment type (stripe/cod/pix), payment status, shipping tracking |
| **Review**   | user ref, order ref, product ref, rating 1-5, title, comment, verified purchase flag                                                      |
| **BlogPost** | title, content, author, featured image, tags, published status                                                                            |
| **Cliente**  | name, email, phone, notes — standalone CRM entries                                                                                        |
| **Romaneio** | items, customer info, total, payment method, date — for direct sales tracking                                                             |
| **Address**  | user ref, street, city, state, CEP, complement                                                                                            |

---

## Running locally

Prerequisites: Node.js 18+, MongoDB Atlas cluster, Stripe account, Cloudinary account, Melhor Envio API key.

```bash
git clone https://github.com/Orlando-Pedrazzoli/elite-surfing-brasil.git

# Backend
cd server
npm install
cp .env.example .env    # Fill in credentials
npm run server          # Port 4001

# Frontend (new terminal)
cd client
npm install
cp .env.example .env    # Backend URL + EmailJS + Stripe public key
npm run dev             # Port 5173
```

Admin panel at `/seller`.

---

## What I'd improve

Being honest about the gaps:

- **TypeScript.** The entire codebase is JavaScript. As it grew past 50+ files, the lack of type safety became painful — especially when passing data between components and API responses.
- **Testing.** Zero automated tests. For a production store processing real payments, this is a risk. Unit tests on the payment controllers and integration tests on the order flow are the priority.
- **PIX automation.** The manual PIX verification works but doesn't scale. Integrating with a PSP that handles PIX natively (like Mercado Pago or Stripe's newer PIX support) would eliminate the manual step.
- **State management.** Everything runs through a single Context provider. It works, but the AppContext file has grown large. Breaking it up or moving to Zustand/TanStack Query would help.
- **Code splitting.** The admin panel components are loaded even for regular customers. Proper lazy loading with React.lazy and route-based splitting would reduce the initial bundle.

---

## Deployment notes

Both frontend and backend deploy to Vercel. Key things I learned:

- Vercel's serverless functions have a 10-second timeout on the free tier. The Melhor Envio API sometimes takes 3-4 seconds to respond, which is fine, but chaining multiple external API calls in one request can get close to the limit.
- SMTP is blocked on Vercel. I originally used Nodemailer with Gmail, which worked locally but failed silently in production. Switched to Resend, which uses HTTP-based email delivery instead of SMTP.
- The `vercel.json` in the server directory configures the Express app as a single serverless function with proper route rewrites.

---

## License

Private project. Code shared for portfolio purposes. All rights reserved.

---

Built by [Orlando Pedrazzoli](https://www.orlandopedrazzoli.com) — Full Stack Developer, Lisbon.

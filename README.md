# Kritya's Jewellery Store

A full-stack e-commerce platform for a luxury jewellery brand — built with React, Node.js, PostgreSQL, Prisma, and ImageKit.

![Homepage](./frontend/public/kritya-hero-1.png)

## ✨ Features

### Customer-facing
- Browse collections, categories, and products with filters
- Product detail pages with images, pricing, and inventory status
- Shopping cart, wishlist, and secure checkout
- User authentication (register / login / forgot password)
- Customer profile with order history and return requests

### Admin panel
- Role-based admin access (Super Admin, Admin, Product Manager, Order Manager, Customer Support, Accountant)
- Permission-based access control (RBAC) enforced on both frontend and backend
- Dashboard with sales, orders, and customer analytics
- Product, category, subcategory, and inventory management
- Order, return, and payment management
- Coupon and banner management
- Customer and admin-user management
- Metal rate and diamond pricing management
- Invoice generation (PDF)
- Image uploads served from ImageKit CDN

## 🛠 Tech Stack

### Frontend
- **React 18** with React Router v6
- **Tailwind CSS** for styling
- **TanStack Query (React Query)** for data fetching
- **Axios** for HTTP
- **Lucide** icons
- **React Hot Toast** for notifications
- **Swiper** for carousels

### Backend
- **Node.js + Express**
- **PostgreSQL** via **Prisma ORM**
- **JWT** authentication
- **Winston** logger
- **Multer** for file handling
- **ImageKit** for image storage and CDN delivery
- **PDFKit** for invoice generation

## 📁 Project Structure
kritya-jewellery-store/
├── backend/ # Express API + Prisma
│ ├── prisma/
│ │ ├── schema.prisma
│ │ ├── seed.js
│ │ └── seed-cms.js
│ ├── src/
│ │ ├── config/ # ImageKit + cache config
│ │ ├── controllers/ # Route handlers
│ │ ├── middleware/ # Auth, RBAC, validation, upload
│ │ ├── routes/ # API routes
│ │ ├── services/ # Business logic
│ │ ├── lib/ # Prisma client, helpers
│ │ └── index.js
│ └── package.json
├── frontend/ # React app
│ ├── public/
│ ├── src/
│ │ ├── components/ # Reusable UI
│ │ ├── context/ # Auth, Cart, Wishlist, Theme
│ │ ├── pages/ # Route pages
│ │ │ └── admin/ # Admin panel pages
│ │ └── App.jsx
│ └── package.json
└── README.md

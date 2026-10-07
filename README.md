# Grand Stay - Hotel Management System 🏨

A modern, full-featured, secure web application for managing hotel operations, room reservations, customer directory, billing & invoices, staff management, and business analytics.

---

## 📋 Features & Module Overview

1. **User Login & Registration**
   - Role-based Access Control (Admin vs. Staff)
   - Password Hashing via `bcryptjs`
   - Secure session management with HTTP cookies
2. **Room Management**
   - Add, Edit, Delete rooms
   - Dynamic room type, price per night, and guest capacity
   - Status tracking (`available`, `occupied`, `maintenance`)
   - Interactive Live Room Availability Floor Grid
3. **Customer Directory**
   - Add/Edit customer details (Name, Phone, Email, ID Proof e.g. Passport/License)
   - Real-time instant search filter across customer records
4. **Booking & Reservations**
   - Create new bookings with date availability check
   - Automated total stay cost calculation based on nights & room rate
   - One-click Check-in and Check-out workflows
   - Automatic room status synchronization
5. **Billing & Invoices**
   - Automated bill generation with extra services (Food, Laundry, Minibar)
   - Payment method recording (Cash, Credit Card, UPI/Online)
   - Clean printable PDF/Invoice view
6. **Staff Management (Admin Restricted)**
   - Add, edit, remove staff records
   - Contact details and monthly salary tracking
7. **Reports & Business Analytics**
   - Live KPI Cards: Total Rooms, Occupancy Rate, Active Bookings, Total Revenue
   - Monthly revenue aggregation
   - Top spending customers table

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6 Fetch API), Bootstrap 5, FontAwesome 6
- **Backend**: Node.js, Express.js, `express-session`, `bcryptjs`
- **Database**:
  - **Local Development**: SQLite (`better-sqlite3`) — Zero setup, instant run
  - **Production Migration**: MySQL / MariaDB (`schema.sql` & `seed.sql` included)

---

## 🚀 Quick Start Guide (Local Setup)

### Prerequisites
- Node.js (v18 or higher) installed on your system.

### Installation Steps

1. Open your terminal in the project directory:
   ```bash
   cd e:\Antigravity
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the application server:
   ```bash
   node server.js
   ```

4. Open your web browser and visit:
   ```text
   http://localhost:3000
   ```

---

## 🔑 Default Login Credentials

| Role | Username | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access (Rooms, Customers, Bookings, Billing, **Staff Management**, Reports, Room Deletion) |
| **Staff** | `staff` | `staff123` | Front desk operations (Rooms, Customers, Bookings, Check-in/out, Invoices) |

---

## 📁 Database Migration & Deployment Guide

For publishing on cloud hosting (Heroku, Render, AWS, VPS, or cPanel Shared Hosting with MySQL):

1. **Import Database Schema to MySQL / phpMyAdmin**:
   - Open phpMyAdmin or MySQL Workbench on your server.
   - Create a database named `hotel_management_db`.
   - Import `schema.sql` to build the database tables.
   - Import `seed.sql` to populate initial test data.

2. **Deploy to Hosting**:
   - Push your code to your GitHub Repository:
     ```bash
     git init
     git add .
     git commit -m "Initial commit of Hotel Management System"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/hotel-management-system.git
     git push -u origin main
     ```
   - Connect your GitHub repo to your web hosting service (Render, Vercel, Railway, AWS EC2, DigitalOcean).
   - Set environment variables (`PORT`, `SESSION_SECRET`).

---

## 🔒 Security Measures Implemented

- **Password Encryption**: All passwords hashed using `bcryptjs` with salt rounds = 10.
- **SQL Injection Prevention**: Parameterized queries across all database operations.
- **Session Protection**: HTTP session cookie authentication with role check middleware (`requireAuth`, `requireAdmin`).

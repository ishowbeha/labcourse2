# Stadium Ticket & Football Shop - Project Plan

## 📋 Project Overview

A complete system for managing stadium tickets and an online football shop with 14 user roles, advanced features, and proper database design (3NF).

## 🎯 Main Goals

1. **Stadium Ticket Management** - Buy/sell tickets for football matches
2. **Football Shop E-commerce** - Sell football shirts, boots, and accessories
3. **User Management** - 14 different roles with specific permissions
4. **Advanced Features** - Online payments, search, and reports

## 📦 Module Breakdown (For Team Distribution)

### **Module 1: Authentication & User Management** ⭐ START HERE
**Assigned to:** [Friend 1]
**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] User registration/login with JWT tokens
- [ ] Password hashing with bcrypt
- [ ] Role-based access control (14 roles)
- [ ] Permission system
- [ ] Refresh token management
- [ ] User profile management

**Files to create:**
- `backend/src/controllers/AuthController.js`
- `backend/src/services/AuthService.js`
- `backend/src/repositories/AuthRepository.js`
- `backend/src/middleware/auth.js`
- `backend/src/routes/authRoutes.js`

---

### **Module 2: Stadium & Match Management**
**Assigned to:** [Friend 2]
**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Stadium CRUD operations
- [ ] Match scheduling and management
- [ ] Section/seat management
- [ ] Ticket generation with QR codes
- [ ] Match status tracking

**Files to create:**
- `backend/src/controllers/StadiumController.js`
- `backend/src/controllers/MatchController.js`
- `backend/src/services/StadiumService.js`
- `backend/src/services/MatchService.js`
- `backend/src/models/Stadium.js`
- `backend/src/models/Match.js`

---

### **Module 3: Ticket Booking System**
**Assigned to:** [Friend 3]
**Priority:** HIGH
**Estimated Time:** 4-5 days

**Tasks:**
- [ ] Ticket search and selection
- [ ] Seat availability checking
- [ ] Shopping cart for tickets
- [ ] Order creation and management
- [ ] Ticket reservation system
- [ ] QR code generation

**Files to create:**
- `backend/src/controllers/TicketController.js`
- `backend/src/controllers/OrderController.js`
- `backend/src/services/TicketService.js`
- `backend/src/services/OrderService.js`
- `backend/src/models/Ticket.js`
- `backend/src/models/Order.js`

---

### **Module 4: E-commerce Shop**
**Assigned to:** [Friend 4]
**Priority:** MEDIUM
**Estimated Time:** 4-5 days

**Tasks:**
- [ ] Product catalog management
- [ ] Product variants (sizes, colors)
- [ ] Shopping cart functionality
- [ ] Product reviews and ratings
- [ ] Inventory management
- [ ] Category management

**Files to create:**
- `backend/src/controllers/ProductController.js`
- `backend/src/controllers/ShopOrderController.js`
- `backend/src/services/ProductService.js`
- `backend/src/services/ShopOrderService.js`
- `backend/src/models/Product.js`
- `backend/src/models/ShopOrder.js`

---

### **Module 5: Payment Integration**
**Assigned to:** [Friend 5]
**Priority:** MEDIUM
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Payment processing for tickets
- [ ] Payment processing for shop orders
- [ ] Refund management
- [ ] Payment status tracking
- [ ] Transaction logging

**Files to create:**
- `backend/src/controllers/PaymentController.js`
- `backend/src/services/PaymentService.js`
- `backend/src/middleware/payment.js`
- `backend/src/models/Payment.js`

---

### **Module 6: Advanced Search & Reports**
**Assigned to:** [Friend 6]
**Priority:** LOW
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Advanced search with filters
- [ ] Search analytics and logging
- [ ] Dynamic report generation
- [ ] Sales reports
- [ ] Ticket sales analytics
- [ ] User activity reports

**Files to create:**
- `backend/src/controllers/SearchController.js`
- `backend/src/controllers/ReportController.js`
- `backend/src/services/SearchService.js`
- `backend/src/services/ReportService.js`
- `backend/src/models/Report.js`

---

### **Module 7: Admin Dashboard & System Tools**
**Assigned to:** [Friend 7]
**Priority:** MEDIUM
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Audit logging system
- [ ] Notification system
- [ ] File upload management
- [ ] System settings management
- [ ] Admin dashboard APIs
- [ ] User activity tracking

**Files to create:**
- `backend/src/controllers/AdminController.js`
- `backend/src/services/AuditService.js`
- `backend/src/services/NotificationService.js`
- `backend/src/middleware/audit.js`

---

### **Module 8: Frontend Development**
**Assigned to:** [Friend 8]
**Priority:** ONGOING
**Estimated Time:** 7-10 days

**Tasks:**
- [ ] User authentication pages (login, register)
- [ ] Ticket booking interface
- [ ] Shop product catalog
- [ ] Shopping cart UI
- [ ] User dashboard
- [ ] Admin dashboard
- [ ] Responsive design

**Files to create:**
- Multiple React components in `frontend/src/`

---

## 🗓️ Timeline & Dependencies

### **Phase 1: Foundation (Week 1)**
- Module 1: Authentication (MUST be done first)
- Database schema setup
- Basic project structure

### **Phase 2: Core Features (Week 2)**
- Module 2: Stadium & Match Management
- Module 3: Ticket Booking System
- Module 4: E-commerce Shop

### **Phase 3: Advanced Features (Week 3)**
- Module 5: Payment Integration
- Module 6: Advanced Search & Reports
- Module 7: Admin Dashboard

### **Phase 4: Frontend & Integration (Week 4)**
- Module 8: Frontend Development
- API integration
- Testing and bug fixes

## 📊 Database Tables (24 Total)

### **Core Tables (Module 1)**
1. `users` - User accounts
2. `roles` - User roles (14 roles)
3. `user_roles` - User-role assignments
4. `permissions` - System permissions
5. `role_permissions` - Role-permission assignments
6. `refresh_tokens` - JWT refresh tokens
7. `audit_logs` - Activity logging

### **Stadium Tables (Module 2)**
8. `stadiums` - Stadium information
9. `sections` - Stadium sections
10. `matches` - Football matches

### **Ticket Tables (Module 3)**
11. `tickets` - Individual tickets
12. `orders` - Ticket orders
13. `order_items` - Order line items

### **Shop Tables (Module 4)**
14. `products` - Shop products
15. `product_variants` - Product options
16. `shop_orders` - Shop orders
17. `shop_order_items` - Shop order items
18. `reviews` - Product reviews

### **System Tables (Modules 5-7)**
19. `payments` - Payment transactions
20. `reports` - Generated reports
21. `search_logs` - Search analytics
22. `notifications` - User notifications
23. `settings` - System settings
24. `files` - File uploads

## 🚀 Getting Started

### **Step 1: Setup (Everyone)**
```bash
# Clone the project
git clone [repository-url]
cd labcourse2

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### **Step 2: Database Setup**
The database will be automatically created with SQLite. No manual setup needed!

### **Step 3: Default Admin**
- Email: `admin@stadium.com`
- Password: `admin123`

## 💡 Tips for Success

1. **Start with Module 1** - Authentication is required for everything else
2. **Use Git branches** - Each friend should work on their own branch
3. **Commit often** - Small, frequent commits are better
4. **Test as you go** - Don't wait until the end to test
5. **Communicate** - Use a group chat to coordinate
6. **Follow the layered architecture** - Controllers → Services → Repositories

## 📝 14 Required Roles

1. **Admin** - Full system access
2. **User** - Basic user access
3. **Manager** - Stadium/operations manager
4. **Ticket Agent** - Sells tickets
5. **Shop Manager** - Manages the shop
6. **Finance** - Handles payments/finances
7. **Support** - Customer support
8. **Content Manager** - Manages website content
9. **Analyst** - Views reports and analytics
10. **Moderator** - Moderates reviews/content
11. **VIP** - Special customer privileges
12. **Staff** - Stadium staff
13. **Security** - Security personnel
14. **Vendor** - Product vendor/supplier

## 🎯 3 Additional Features

1. **Online Payment Integration** - Stripe/PayPal integration
2. **Advanced Search** - Filters, sorting, analytics
3. **Dynamic Report Generation** - Customizable reports

## ✅ Database Requirements

- ✅ All tables in Third Normal Form (3NF)
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ `created_by`, `updated_by`, `created_at`, `updated_at` columns
- ✅ Proper constraints and validations

---

**Ready to start? Begin with Module 1 (Authentication) and follow the plan!** 🚀
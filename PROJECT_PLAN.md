# Stadium Ticket Management System - Project Plan

## 📋 Project Overview

A complete system for managing stadium tickets with 10 user roles, advanced features, and proper database design (3NF). **Focused only on ticket management - no e-commerce.**

## 🎯 Main Goals

1. **Stadium Ticket Management** - Buy/sell tickets for football matches
2. **User Management** - 10 different roles with specific permissions
3. **Advanced Features** - Online payments, search, and reports

## 📦 Module Breakdown (For Team Distribution)

### **Module 1: Authentication & User Management** ⭐ DONE
**Assigned to:** [Completed]
**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [x] User registration/login with JWT tokens
- [x] Password hashing with bcrypt
- [x] Role-based access control (10 roles)
- [x] Permission system
- [x] Refresh token management
- [x] User profile management

**Files created:**
- `backend/src/controllers/AuthController.js`
- `backend/src/services/AuthService.js`
- `backend/src/repositories/AuthRepository.js`
- `backend/src/middleware/auth.js`
- `backend/src/routes/authRoutes.js`

---

### **Module 2: Stadium & Match Management**
**Assigned to:** [Friend 1]
**Priority:** HIGH
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Stadium CRUD operations
- [ ] Match scheduling and management
- [ ] Section/seat management
- [ ] Stadium capacity tracking
- [ ] Match status tracking

**Files to create:**
- `backend/src/controllers/StadiumController.js`
- `backend/src/controllers/MatchController.js`
- `backend/src/services/StadiumService.js`
- `backend/src/services/MatchService.js`
- `backend/src/models/Stadium.js`
- `backend/src/models/Match.js`
- `backend/src/routes/stadiumRoutes.js`
- `backend/src/routes/matchRoutes.js`

---

### **Module 3: Ticket Booking System**
**Assigned to:** [Friend 2]
**Priority:** HIGH
**Estimated Time:** 4-5 days

**Tasks:**
- [ ] Ticket search and selection
- [ ] Seat availability checking
- [ ] Ticket reservation system
- [ ] Order creation and management
- [ ] QR code generation
- [ ] Ticket status management

**Files to create:**
- `backend/src/controllers/TicketController.js`
- `backend/src/controllers/OrderController.js`
- `backend/src/services/TicketService.js`
- `backend/src/services/OrderService.js`
- `backend/src/models/Ticket.js`
- `backend/src/models/Order.js`
- `backend/src/routes/ticketRoutes.js`
- `backend/src/routes/orderRoutes.js`

---

### **Module 4: Payment Integration**
**Assigned to:** [Friend 3]
**Priority:** MEDIUM
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Payment processing for tickets
- [ ] Refund management
- [ ] Payment status tracking
- [ ] Transaction logging

**Files to create:**
- `backend/src/controllers/PaymentController.js`
- `backend/src/services/PaymentService.js`
- `backend/src/middleware/payment.js`
- `backend/src/models/Payment.js`
- `backend/src/routes/paymentRoutes.js`

---

### **Module 5: Advanced Search & Reports**
**Assigned to:** [Friend 4]
**Priority:** LOW
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Advanced search with filters
- [ ] Search analytics and logging
- [ ] Dynamic report generation
- [ ] Ticket sales reports
- [ ] Match attendance reports
- [ ] Revenue analytics

**Files to create:**
- `backend/src/controllers/SearchController.js`
- `backend/src/controllers/ReportController.js`
- `backend/src/services/SearchService.js`
- `backend/src/services/ReportService.js`
- `backend/src/models/Report.js`
- `backend/src/routes/searchRoutes.js`
- `backend/src/routes/reportRoutes.js`

---

### **Module 6: Admin Dashboard & System Tools**
**Assigned to:** [Friend 5]
**Priority:** MEDIUM
**Estimated Time:** 3-4 days

**Tasks:**
- [ ] Audit logging system
- [ ] Notification system
- [ ] System settings management
- [ ] Admin dashboard APIs
- [ ] User activity tracking

**Files to create:**
- `backend/src/controllers/AdminController.js`
- `backend/src/services/AuditService.js`
- `backend/src/services/NotificationService.js`
- `backend/src/middleware/audit.js`
- `backend/src/routes/adminRoutes.js`

---

### **Module 7: Frontend Development**
**Assigned to:** [Friend 6]
**Priority:** ONGOING
**Estimated Time:** 7-10 days

**Tasks:**
- [ ] User authentication pages (login, register)
- [ ] Ticket booking interface
- [ ] Seat selection UI
- [ ] Shopping cart for tickets
- [ ] User dashboard
- [ ] Admin dashboard
- [ ] Responsive design

**Files to create:**
- Multiple React components in `frontend/src/`

---

## 🗓️ Timeline & Dependencies

### **Phase 1: Foundation (Week 1)**
- Module 1: Authentication ✅ COMPLETED
- Database schema setup
- Basic project structure

### **Phase 2: Core Features (Week 2)**
- Module 2: Stadium & Match Management
- Module 3: Ticket Booking System

### **Phase 3: Advanced Features (Week 3)**
- Module 4: Payment Integration
- Module 5: Advanced Search & Reports
- Module 6: Admin Dashboard

### **Phase 4: Frontend & Integration (Week 4)**
- Module 7: Frontend Development
- API integration
- Testing and bug fixes

## 📊 Database Tables (18 Total)

### **Core Tables (Module 1)**
1. `users` - User accounts
2. `roles` - User roles (10 roles)
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

### **System Tables (Modules 4-6)**
14. `payments` - Payment transactions
15. `notifications` - User notifications
16. `settings` - System settings

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

1. **Start with Module 2** - Stadium and match management are the foundation
2. **Use Git branches** - Each friend should work on their own branch
3. **Commit often** - Small, frequent commits are better
4. **Test as you go** - Don't wait until the end to test
5. **Communicate** - Use a group chat to coordinate
6. **Follow the layered architecture** - Controllers → Services → Repositories

## 📝 10 Required Roles

1. **Admin** - Full system access
2. **User** - Basic user access
3. **Manager** - Stadium/operations manager
4. **Ticket Agent** - Sells tickets
5. **Finance** - Handles payments/finances
6. **Support** - Customer support
7. **Analyst** - Views reports and analytics
8. **Moderator** - Moderates content
9. **VIP** - Special customer privileges
10. **Staff** - Stadium staff

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

**Ready to continue? Start with Module 2 (Stadium & Match Management)!** 🚀
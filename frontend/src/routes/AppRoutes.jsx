import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import {
  AdminPlaceholder,
  AdminRoute,
  ProtectedRoute,
  PublicRoute,
  UserPage,
} from './guards';
import {
  AdminCoupons,
  AdminDashboard,
  AdminMatches,
  AdminOrders,
  AdminReports,
  AdminReviews,
  AdminSettings,
  AdminStadiums,
  AdminUsers,
  Chat,
  Favorites,
  Home,
  Login,
  Matches,
  MyProfile,
  MyReviews,
  Orders,
  Register,
  Stadiums,
  Tickets,
} from './lazyPages';

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="/stadiums" element={<ProtectedRoute><Stadiums /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><MyReviews /></ProtectedRoute>} />

        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/stadiums" element={<AdminRoute><AdminStadiums /></AdminRoute>} />
        <Route path="/admin/matches" element={<AdminRoute><AdminMatches /></AdminRoute>} />
        <Route path="/admin/tickets" element={<AdminRoute><AdminPlaceholder title="Ticket Management" /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/payments" element={<AdminRoute><AdminPlaceholder title="Payment Management" /></AdminRoute>} />
        <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
        <Route path="/admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UserPage title="👥 User Management" description="Manage user accounts and roles." />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

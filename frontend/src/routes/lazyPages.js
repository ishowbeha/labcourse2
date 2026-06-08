import { lazy } from 'react';

export const Login = lazy(() => import(/* webpackChunkName: "auth" */ '../pages/Login'));
export const Register = lazy(() => import(/* webpackChunkName: "auth" */ '../pages/Register'));

export const Home = lazy(() => import(/* webpackChunkName: "user-home" */ '../pages/Home'));
export const Matches = lazy(() => import(/* webpackChunkName: "user-matches" */ '../pages/Matches'));
export const Tickets = lazy(() => import(/* webpackChunkName: "user-tickets" */ '../pages/Tickets'));
export const Stadiums = lazy(() => import(/* webpackChunkName: "user-stadiums" */ '../pages/Stadiums'));
export const Orders = lazy(() => import(/* webpackChunkName: "user-orders" */ '../pages/Orders'));
export const Favorites = lazy(() => import(/* webpackChunkName: "user-favorites" */ '../pages/Favorites'));
export const MyReviews = lazy(() => import(/* webpackChunkName: "user-reviews" */ '../pages/MyReviews'));
export const MyProfile = lazy(() => import(/* webpackChunkName: "user-profile" */ '../pages/MyProfile'));
export const Chat = lazy(() => import(/* webpackChunkName: "user-chat" */ '../pages/Chat'));

export const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin-dashboard" */ '../pages/AdminDashboard'));
export const AdminUsers = lazy(() => import(/* webpackChunkName: "admin-users" */ '../pages/AdminUsers'));
export const AdminStadiums = lazy(() => import(/* webpackChunkName: "admin-stadiums" */ '../pages/AdminStadiums'));
export const AdminMatches = lazy(() => import(/* webpackChunkName: "admin-matches" */ '../pages/AdminMatches'));
export const AdminTickets = lazy(() => import(/* webpackChunkName: "admin-tickets" */ '../pages/AdminTickets'));
export const AdminOrders = lazy(() => import(/* webpackChunkName: "admin-orders" */ '../pages/AdminOrders'));
export const AdminPayments = lazy(() => import(/* webpackChunkName: "admin-payments" */ '../pages/AdminPayments'));
export const AdminCoupons = lazy(() => import(/* webpackChunkName: "admin-coupons" */ '../pages/AdminCoupons'));
export const AdminReviews = lazy(() => import(/* webpackChunkName: "admin-reviews" */ '../pages/AdminReviews'));
export const AdminReports = lazy(() => import(/* webpackChunkName: "admin-reports" */ '../pages/AdminReports'));
export const AdminSettings = lazy(() => import(/* webpackChunkName: "admin-settings" */ '../pages/AdminSettings'));

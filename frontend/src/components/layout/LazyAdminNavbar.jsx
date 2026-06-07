import React, { Suspense, lazy } from 'react';

const AdminNavbar = lazy(() => import(/* webpackChunkName: "layout" */ '../AdminNavbar'));

const navbarFallback = <div className="admin-header" style={{ height: 64 }} aria-hidden="true" />;

export default function LazyAdminNavbar(props) {
  return (
    <Suspense fallback={navbarFallback}>
      <AdminNavbar {...props} />
    </Suspense>
  );
}

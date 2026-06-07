import React, { Suspense, lazy } from 'react';

const Navbar = lazy(() => import(/* webpackChunkName: "layout" */ '../Navbar'));

const navbarFallback = <div className="bg-dark" style={{ height: 56 }} aria-hidden="true" />;

export default function LazyNavbar() {
  return (
    <Suspense fallback={navbarFallback}>
      <Navbar />
    </Suspense>
  );
}

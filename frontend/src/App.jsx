import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import StoreInitializer from './store/StoreInitializer';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <Router>
      <StoreInitializer />
      <AppRoutes />
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <div className="App">
        <nav style={navStyle}>
          <div className="container">
            <Link to="/" style={linkStyle}>Home</Link>
            <span style={{ margin: '0 20px' }}>|</span>
            <Link to="/users" style={linkStyle}>Users</Link>
            <span style={{ margin: '0 20px' }}>|</span>
            <Link to="/categories" style={linkStyle}>Categories</Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/users" element={
            <div className="container">
              <h1>Users Management</h1>
              <p>Users page content here...</p>
            </div>
          } />
          <Route path="/categories" element={
            <div className="container">
              <h1>Categories Management</h1>
              <p>Categories page content here...</p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

const navStyle = {
  backgroundColor: '#333',
  padding: '15px 0',
  marginBottom: '20px'
};

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '16px'
};

export default App;
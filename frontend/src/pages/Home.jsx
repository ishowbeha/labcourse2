import React from 'react';
import UserList from '../components/UserList';
import CategoryList from '../components/CategoryList';

const Home = () => {
  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Layered Architecture Demo</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <UserList />
        <CategoryList />
      </div>
    </div>
  );
};

export default Home;
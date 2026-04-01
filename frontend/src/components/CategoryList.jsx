import React from 'react';
import useCategories from '../hooks/useCategories';

const CategoryList = () => {
  const { categories, loading, error, removeCategory } = useCategories();

  if (loading) return <div className="loading">Loading categories...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await removeCategory(id);
      } catch (err) {
        alert('Failed to delete category: ' + err.message);
      }
    }
  };

  return (
    <div className="card">
      <h2>Categories</h2>
      {categories.length === 0 ? (
        <p>No categories found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td style={tdStyle}>{category.name}</td>
                <td style={tdStyle}>{category.description}</td>
                <td style={tdStyle}>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(category.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const thStyle = {
  textAlign: 'left',
  padding: '10px',
  borderBottom: '2px solid #ddd',
  backgroundColor: '#f8f9fa'
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #ddd'
};

export default CategoryList;
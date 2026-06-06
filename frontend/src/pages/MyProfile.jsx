import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserService from '../services/UserService';
import axios from 'axios';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

const MyProfile = () => {
  const { user, logout, isAdmin, updateUser } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || user.firstName || '',
        last_name: user.last_name || user.lastName || '',
        email: user.email || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      // Generate avatar URL based on email
      const emailHash = hashCode(user.email || '');
      setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + ' ' + user.last_name)}&background=3498db&color=fff&size=150`);
    }
  }, [user]);

  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form when canceling
      setFormData(prev => ({
        ...prev,
        first_name: user.first_name || user.firstName || '',
        last_name: user.last_name || user.lastName || '',
        email: user.email || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
      setError(null);
      setSuccess(null);
    }
    setIsEditing(!isEditing);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('First name, last name, and email are required');
      return;
    }

    // Password validation
    if (formData.new_password || formData.confirm_password) {
      if (!formData.current_password) {
        setError('Current password is required to change password');
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError('New passwords do not match');
        return;
      }
      if (formData.new_password.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Update profile via API
      const updateData = {
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email
      };

      // Include password change if requested
      if (formData.new_password && formData.current_password) {
        updateData.currentPassword = formData.current_password;
        updateData.newPassword = formData.new_password;
      }

      const res = await axios.put('/api/users/profile', updateData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });

      if (res.data?.success) {
        // Update local auth context
        updateUser({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email
        });
        
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
        
        // Update avatar URL with new name
        const newAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.first_name + ' ' + formData.last_name)}&background=3498db&color=fff&size=150`;
        setAvatarUrl(newAvatarUrl);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>👤 My Profile</h1>
            <p style={styles.welcome}>Manage your account settings</p>
          </div>
          <div style={styles.userInfo}>
            {isAdmin() ? (
              <Link to="/admin/dashboard" style={styles.dashboardBtn}>⬅ Dashboard</Link>
            ) : (
              <Link to="/home" style={styles.dashboardBtn}>🏠 Home</Link>
            )}
            <span style={styles.userName}>{user?.first_name} {user?.last_name}</span>
            <span style={styles.userRole}>{isAdmin() ? 'Administrator' : 'User'}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </header>

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)} style={styles.dismissBtn}>✕</button>
          </div>
        )}
        
        {success && (
          <div style={styles.successBanner}>
            {success}
            <button onClick={() => setSuccess(null)} style={styles.dismissBtn}>✕</button>
          </div>
        )}

        <div style={styles.profileLayout}>
          {/* Profile Card */}
          <div style={styles.profileCard}>
            <div style={styles.avatarSection}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={`${user?.first_name} ${user?.last_name}`}
                  style={styles.avatar}
                />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              )}
              <div style={styles.userInfo}>
                <h2 style={styles.profileName}>{user?.first_name} {user?.last_name}</h2>
                <p style={styles.profileEmail}>{user?.email}</p>
                <span style={styles.roleBadge}>{isAdmin() ? 'Administrator' : 'User'}</span>
              </div>
            </div>

            <div style={styles.profileStats}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Member Since</span>
                <span style={styles.statValue}>{formatDate(user?.created_at)}</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Last Login</span>
                <span style={styles.statValue}>{formatDate(user?.last_login)}</span>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>
                {isEditing ? '✏️ Edit Profile' : '📋 Profile Information'}
              </h2>
              <button 
                onClick={handleEditToggle}
                style={isEditing ? styles.cancelBtn : styles.editBtn}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                    style={styles.input}
                    placeholder="Enter your first name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                    style={styles.input}
                    placeholder="Enter your last name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing || saving}
                    style={styles.input}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {isEditing && (
                <>
                  <div style={styles.sectionDivider}>
                    <span style={styles.sectionTitle}>🔒 Change Password</span>
                    <p style={styles.sectionHint}>Leave blank to keep current password</p>
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Current Password</label>
                      <input
                        type="password"
                        name="current_password"
                        value={formData.current_password}
                        onChange={handleInputChange}
                        disabled={saving}
                        style={styles.input}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>New Password</label>
                      <input
                        type="password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleInputChange}
                        disabled={saving}
                        style={styles.input}
                        placeholder="Enter new password"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Confirm New Password</label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleInputChange}
                        disabled={saving}
                        style={styles.input}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </>
              )}

              {isEditing && (
                <div style={styles.formActions}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={saving ? styles.saveBtnDisabled : styles.saveBtn}
                  >
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

// Add Link import
import { Link } from 'react-router-dom';

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2c3e50', color: 'white', padding: '20px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  title: { margin: '0', fontSize: '28px' },
  welcome: { margin: '5px 0 0 0', color: '#bdc3c7', fontSize: '14px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  userName: { fontWeight: '600' },
  userRole: { backgroundColor: '#3498db', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' },
  logoutBtn: { backgroundColor: 'transparent', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  dashboardBtn: { backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  successBanner: { backgroundColor: '#d1fae5', border: '1px solid #10b981', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dismissBtn: { backgroundColor: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', padding: '4px 8px' },
  profileLayout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start' },
  profileCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '24px', position: 'sticky', top: '20px' },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #eee' },
  avatar: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#3498db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold' },
  profileName: { margin: '0', fontSize: '20px', color: '#2c3e50', textAlign: 'center', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' },
  profileEmail: { margin: '4px 0', fontSize: '14px', color: '#7f8c8d', textAlign: 'center', wordBreak: 'break-all', overflowWrap: 'break-word' },
  roleBadge: { backgroundColor: '#3498db', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' },
  profileStats: { display: 'flex', flexDirection: 'column', gap: '16px' },
  statItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  statLabel: { fontSize: '12px', color: '#7f8c8d' },
  statValue: { fontSize: '14px', color: '#2c3e50', fontWeight: '500' },
  formCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '24px' },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #eee' },
  formTitle: { margin: '0', fontSize: '20px', color: '#2c3e50' },
  editBtn: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  cancelBtn: { backgroundColor: '#95a5a6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#2c3e50' },
  input: { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s' },
  sectionDivider: { paddingTop: '20px', borderTop: '1px solid #eee' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' },
  sectionHint: { fontSize: '12px', color: '#7f8c8d', margin: '0 0 16px 0' },
  formActions: { display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' },
  saveBtn: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  saveBtnDisabled: { backgroundColor: '#95a5a6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'not-allowed', fontSize: '14px', fontWeight: '600' },
};

const responsiveStyles = {
  mobile: {
    main: { ...styles.main, padding: '20px 15px' },
    profileLayout: { ...styles.profileLayout, gridTemplateColumns: '1fr' },
    formGrid: { ...styles.formGrid, gridTemplateColumns: '1fr' },
    headerContent: { ...styles.headerContent, flexDirection: 'column', alignItems: 'flex-start' },
    userInfo: { ...styles.userInfo, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' },
  },
  tablet: {
    main: { ...styles.main, padding: '30px 15px' },
    profileLayout: { ...styles.profileLayout, gridTemplateColumns: '1fr' },
    formGrid: { ...styles.formGrid, gridTemplateColumns: '1fr' },
    headerContent: { ...styles.headerContent, padding: '0 15px' },
  }
};

export default MyProfile;
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import LazyNavbar from '../components/layout/LazyNavbar';
import axios from 'axios';

const MyProfile = () => {
  const { user, isAdmin, updateUser } = useAuth();
  
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-vh-100 bg-light">
      <LazyNavbar />

      <Container className="py-4 py-md-5">
        <div className="text-center mb-4">
          <h1 className="h2 text-dark">👤 My Profile</h1>
          <p className="text-muted mb-0">Manage your account settings</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Row className="g-4">
          <Col lg={4}>
            <Card className="shadow-sm border-0 sticky-top">
              <Card.Body className="text-center">
                <div className="border-bottom pb-4 mb-4">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={`${user?.first_name} ${user?.last_name}`}
                      className="rounded-circle mb-3"
                      width={100}
                      height={100}
                    />
                  ) : (
                    <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mx-auto mb-3 fw-bold fs-1 p-4">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                  )}
                  <h2 className="h5 text-dark mb-1">{user?.first_name} {user?.last_name}</h2>
                  <p className="small text-muted text-break mb-2">{user?.email}</p>
                  <Badge bg="primary">{isAdmin() ? 'Administrator' : 'User'}</Badge>
                </div>

                <div className="text-start">
                  <div className="mb-3">
                    <div className="small text-muted">Member Since</div>
                    <div className="fw-medium">{formatDate(user?.created_at)}</div>
                  </div>
                  <div>
                    <div className="small text-muted">Last Login</div>
                    <div className="fw-medium">{formatDate(user?.last_login)}</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                  <h2 className="h5 text-dark mb-0">
                    {isEditing ? '✏️ Edit Profile' : '📋 Profile Information'}
                  </h2>
                  <Button 
                    variant={isEditing ? 'secondary' : 'primary'}
                    onClick={handleEditToggle}
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>First Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving}
                          placeholder="Enter your first name"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Last Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving}
                          placeholder="Enter your last name"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={!isEditing || saving}
                          placeholder="Enter your email"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {isEditing && (
                    <>
                      <div className="border-top pt-4 mt-4">
                        <div className="fw-semibold text-dark mb-1">🔒 Change Password</div>
                        <p className="small text-muted mb-3">Leave blank to keep current password</p>
                      </div>

                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control
                              type="password"
                              name="current_password"
                              value={formData.current_password}
                              onChange={handleInputChange}
                              disabled={saving}
                              placeholder="Enter current password"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                              type="password"
                              name="new_password"
                              value={formData.new_password}
                              onChange={handleInputChange}
                              disabled={saving}
                              placeholder="Enter new password"
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                              type="password"
                              name="confirm_password"
                              value={formData.confirm_password}
                              onChange={handleInputChange}
                              disabled={saving}
                              placeholder="Confirm new password"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </>
                  )}

                  {isEditing && (
                    <div className="d-flex justify-content-end border-top pt-4 mt-4">
                      <Button
                        type="submit"
                        variant="success"
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : '💾 Save Changes'}
                      </Button>
                    </div>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default MyProfile;

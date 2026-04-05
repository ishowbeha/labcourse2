import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const NotificationBell = () => {
  const { notifications, unreadCount, markNotificationRead, clearNotifications } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ticket_purchase': return '🎫';
      case 'order_confirmed': return '✅';
      case 'order_pending': return '⏳';
      case 'message': return '💬';
      case 'system': return '🔔';
      case 'broadcast': return '📢';
      default: return '🔔';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);
    setShowDropdown(false);
  };

  return (
    <div style={styles.container}>
      <button 
        style={styles.bellButton}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span style={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h4 style={styles.dropdownTitle}>Notifications</h4>
            {notifications.length > 0 && (
              <button style={styles.clearBtn} onClick={clearNotifications}>
                Clear all
              </button>
            )}
          </div>

          <div style={styles.notificationList}>
            {notifications.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div 
                  key={notification.id} 
                  style={styles.notificationItem}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div style={styles.notificationContent}>
                    <p style={styles.notificationTitle}>{notification.title}</p>
                    <p style={styles.notificationMessage}>{notification.message}</p>
                    <span style={styles.notificationTime}>{getTimeAgo(notification.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div style={styles.dropdownFooter}>
              <p>{notifications.length - 10} more notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  bellButton: {
    position: 'relative',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: '20px',
  },
  badge: {
    position: 'absolute',
    top: '0',
    right: '0',
    backgroundColor: '#e74c3c',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '8px',
    width: '360px',
    maxWidth: '90vw',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #eee',
  },
  dropdownTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  clearBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3498db',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  notificationList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  notificationItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  notificationIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  notificationMessage: {
    margin: '0 0 4px 0',
    fontSize: '13px',
    color: '#7f8c8d',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  notificationTime: {
    fontSize: '11px',
    color: '#bdc3c7',
  },
  emptyState: {
    padding: '40px 16px',
    textAlign: 'center',
    color: '#7f8c8d',
  },
  dropdownFooter: {
    padding: '12px 16px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#7f8c8d',
    borderTop: '1px solid #eee',
    backgroundColor: '#f8f9fa',
  },
};

export default NotificationBell;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Badge, Button, ListGroup } from 'react-bootstrap';
import { useSocket } from '../context/SocketContext';

const NotificationBell = () => {
  const { notifications, unreadCount, markNotificationRead, clearNotifications } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ticket_purchase': return '🎫';
      case 'order_confirmed': return '✅';
      case 'order_pending': return '⏳';
      case 'refund': return '💰';
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

  const getMessageSenderId = (notification) =>
    notification.data?.from || notification.fromUserId || null;

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);
    setShowDropdown(false);

    if (notification.type === 'message') {
      const senderId = getMessageSenderId(notification);
      navigate(senderId ? `/chat?user=${senderId}` : '/chat');
      return;
    }

    if (['refund', 'order_confirmed', 'order_pending', 'ticket_purchase'].includes(notification.type)) {
      navigate('/orders');
    }
  };

  return (
    <Dropdown show={showDropdown} onToggle={(isOpen) => setShowDropdown(isOpen)} align="end">
      <Dropdown.Toggle
        as={Button}
        variant="link"
        className="text-white text-decoration-none p-2 position-relative border-0"
      >
        <span className="fs-5">🔔</span>
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            className="position-absolute top-0 start-100 translate-middle"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow border-0 p-0" style={{ width: 'min(480px, 90vw)' }}>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h6 className="mb-0 fw-semibold">Notifications</h6>
          {notifications.length > 0 && (
            <Button variant="link" size="sm" className="p-0" onClick={clearNotifications}>
              Clear all
            </Button>
          )}
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div className="text-center text-muted p-4">
              <p className="mb-0">No notifications yet</p>
            </div>
          ) : (
            <ListGroup variant="flush">
              {notifications.slice(0, 10).map((notification) => (
                <ListGroup.Item
                  key={notification.id}
                  action
                  onClick={() => handleNotificationClick(notification)}
                  className="d-flex gap-3 py-3"
                >
                  <span className="fs-4 flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                  <div className="min-w-0">
                    <p className="mb-1 fw-semibold text-truncate">{notification.title}</p>
                    <p className="mb-1 small text-muted text-truncate">{notification.message}</p>
                    <span className="text-muted" style={{ fontSize: '11px' }}>
                      {getTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>

        {notifications.length > 10 && (
          <div className="text-center small text-muted p-2 border-top bg-light">
            {notifications.length - 10} more notifications
          </div>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;

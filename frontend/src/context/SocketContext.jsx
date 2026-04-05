import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to Socket.IO server
      const newSocket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      // Welcome event
      newSocket.on('welcome', (data) => {
        console.log('🎉 Welcome:', data.message);
      });

      // Online users count
      newSocket.on('online-users', (data) => {
        setOnlineCount(data.count);
      });

      // Real-time notifications
      newSocket.on('notification', (notification) => {
        console.log('🔔 New notification:', notification);
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      });

      // Broadcast messages
      newSocket.on('broadcast', (data) => {
        console.log('📢 Broadcast:', data);
        setNotifications(prev => [data, ...prev].slice(0, 50));
      });

      // Chat messages
      newSocket.on('receive-message', (message) => {
        console.log('💬 New message:', message);
        setNotifications(prev => [{
          id: message.id,
          type: 'message',
          title: `New message from ${message.fromName}`,
          message: message.message,
          timestamp: message.timestamp,
          data: message
        }, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, token]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Send chat message
  const sendMessage = useCallback((to, message, type = 'text') => {
    if (socket) {
      socket.emit('send-message', { to, message, type });
    }
  }, [socket]);

  // Send typing indicator
  const sendTyping = useCallback((to) => {
    if (socket) {
      socket.emit('typing', { to });
    }
  }, [socket]);

  // Stop typing indicator
  const stopTyping = useCallback((to) => {
    if (socket) {
      socket.emit('stop-typing', { to });
    }
  }, [socket]);

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId) => {
    if (socket) {
      socket.emit('mark-notification-read', { notificationId });
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [socket]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value = {
    socket,
    connected,
    notifications,
    onlineCount,
    unreadCount,
    sendMessage,
    sendTyping,
    stopTyping,
    markNotificationRead,
    clearNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
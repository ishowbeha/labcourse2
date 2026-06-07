import { create } from 'zustand';
import { io } from 'socket.io-client';
import axios from 'axios';

const loadPastNotifications = async (token) => {
  try {
    const res = await axios.get('/api/notifications', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    });
    if (res.data?.success && res.data?.data) {
      return res.data.data;
    }
  } catch (e) {
    console.log('Could not load past notifications:', e.message);
  }
  return [];
};

const conversationKey = (userId, partnerId) => String(Math.min(userId, partnerId)) + '-' + String(Math.max(userId, partnerId));

const appendUniqueMessage = (messages, msg) => {
  const exists = messages.some(
    (m) => m.id === msg.id || (m.message === msg.message && m.timestamp === msg.timestamp)
  );
  if (exists) return messages;
  return [...messages, msg].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  notifications: [],
  onlineCount: 0,
  onlineUserIds: [],
  unreadCount: 0,
  conversations: {},
  typingUsers: {},

  setConnected: (connected) => set({ connected }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),

  appendChatMessage: (currentUserId, partnerId, message) => {
    const key = conversationKey(currentUserId, partnerId);
    set((state) => ({
      conversations: {
        ...state.conversations,
        [key]: appendUniqueMessage(state.conversations[key] || [], message),
      },
    }));
  },

  setConversationMessages: (currentUserId, partnerId, messages) => {
    const key = conversationKey(currentUserId, partnerId);
    set((state) => ({
      conversations: {
        ...state.conversations,
        [key]: messages,
      },
    }));
  },

  setUserTyping: (userId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [userId]: isTyping,
      },
    }));
  },

  connect: async (token) => {
    get().disconnect();

    const pastNots = await loadPastNotifications(token);
    if (pastNots.length > 0) {
      set({
        notifications: pastNots,
        unreadCount: pastNots.filter((n) => !n.isRead).length,
      });
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      set({ connected: true });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      set({ connected: false, onlineUserIds: [] });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    newSocket.on('online-users', (data) => {
      const onlineUserIds = (data.users || []).map((u) => u.userId).filter(Boolean);
      set({ onlineCount: data.count, onlineUserIds });
    });

    newSocket.on('notification', (notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      }));

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    });

    newSocket.on('receive-message', (message) => {
      const chatNotification = {
        id: message.id,
        type: 'message',
        title: `New message from ${message.fromName}`,
        message: message.message,
        timestamp: message.timestamp,
        fromUserId: message.from,
        data: message,
      };

      set((state) => ({
        notifications: [chatNotification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      }));

      if ('Notification' in window && Notification.permission === 'granted') {
        const desktopNotif = new Notification(chatNotification.title, {
          body: chatNotification.message,
          icon: '/favicon.ico',
        });
        desktopNotif.onclick = () => {
          window.focus();
          window.location.assign(`/chat?user=${message.from}`);
        };
      }

      const currentUserId = message.to;
      get().appendChatMessage(currentUserId, message.from, {
        id: message.id,
        from: message.from,
        to: message.to,
        message: message.message,
        timestamp: message.timestamp,
        direction: 'in',
        fromName: message.fromName,
      });
    });

    newSocket.on('message-sent', (message) => {
      get().appendChatMessage(message.from, message.to, {
        id: message.id,
        from: message.from,
        to: message.to,
        message: message.message,
        timestamp: message.timestamp,
        direction: 'out',
        status: message.status,
      });
    });

    newSocket.on('user-typing', (data) => {
      get().setUserTyping(data.from, data.isTyping);
    });

    set({ socket: newSocket });
    return newSocket;
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
    }
    set({
      socket: null,
      connected: false,
      notifications: [],
      onlineCount: 0,
      onlineUserIds: [],
      unreadCount: 0,
      conversations: {},
      typingUsers: {},
    });
  },

  sendMessage: (to, message, type = 'text') => {
    get().socket?.emit('send-message', { to, message, type });
  },

  sendTyping: (to) => {
    get().socket?.emit('typing', { to });
  },

  stopTyping: (to) => {
    get().socket?.emit('stop-typing', { to });
  },

  markNotificationRead: (notificationId) => {
    get().socket?.emit('mark-notification-read', { notificationId });
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  getConversation: (currentUserId, partnerId) => {
    const key = conversationKey(currentUserId, partnerId);
    return get().conversations[key] || [];
  },

  isUserOnline: (userId) => get().onlineUserIds.includes(Number(userId)),
}));

export const useSocket = () => useSocketStore();

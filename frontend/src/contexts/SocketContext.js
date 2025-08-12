import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [eventListeners, setEventListeners] = useState({});

  // Get socket server URL
  const getSocketUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      return 'https://interactivewebs.com';
    }
    return 'http://localhost:3001';
  };

  // Connect to socket
  const connect = useCallback(() => {
    if (!user || !isAuthenticated || socketRef.current?.connected) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token available for socket connection');
        return;
      }

      console.log('Connecting to socket server...');

      socketRef.current = io(getSocketUrl(), {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected:', socketRef.current.id);
        setIsConnected(true);
        setConnectionError(null);
        
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
        
        // Only show error for unexpected disconnections
        if (reason === 'io server disconnect') {
          setConnectionError('Server disconnected');
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        // Attempt to reconnect after delay
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 5000);
        }
      });

      // Authentication error
      socketRef.current.on('auth_error', (error) => {
        console.error('Socket authentication error:', error);
        setConnectionError('Authentication failed');
        disconnect();
      });

      // Real-time event handlers
      socketRef.current.on('recall_updated', (data) => {
        console.log('Recall updated:', data);
        toast.success(`${data.userName} responded: ${data.response}`);
        
        // Trigger custom event listeners
        triggerEventListeners('recall_updated', data);
      });

      socketRef.current.on('assignment_updated', (data) => {
        console.log('Assignment updated:', data);
        toast.info(`New assignment by ${data.assignedByName}`);
        
        // Trigger custom event listeners
        triggerEventListeners('assignment_updated', data);
      });

      socketRef.current.on('new_recall', (data) => {
        console.log('New recall:', data);
        toast.success('🚨 New recall created!');
        
        // Trigger custom event listeners
        triggerEventListeners('new_recall', data);
      });

      socketRef.current.on('recall_cancelled', (data) => {
        console.log('Recall cancelled:', data);
        toast.warning('❌ Recall cancelled');
        
        // Trigger custom event listeners
        triggerEventListeners('recall_cancelled', data);
      });

      socketRef.current.on('recall_edited', (data) => {
        console.log('Recall edited:', data);
        toast.info('📝 Recall details updated');
        
        // Trigger custom event listeners
        triggerEventListeners('recall_edited', data);
      });

    } catch (error) {
      console.error('Error connecting to socket:', error);
      setConnectionError(error.message);
    }
  }, [user, isAuthenticated]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting from socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Emit event to server
  const emit = useCallback((event, data, callback) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, callback);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
      if (callback) {
        callback({ error: 'Socket not connected' });
      }
    }
  }, []);

  // Add event listener
  const addEventListener = useCallback((event, listener) => {
    setEventListeners(prev => ({
      ...prev,
      [event]: [...(prev[event] || []), listener]
    }));

    // Return cleanup function
    return () => {
      setEventListeners(prev => ({
        ...prev,
        [event]: (prev[event] || []).filter(l => l !== listener)
      }));
    };
  }, []);

  // Trigger custom event listeners
  const triggerEventListeners = useCallback((event, data) => {
    const listeners = eventListeners[event] || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }, [eventListeners]);

  // Send recall response notification
  const notifyRecallResponse = useCallback((recallId, response) => {
    emit('recall_response', {
      recallId,
      response,
      timestamp: new Date().toISOString()
    });
  }, [emit]);

  // Send assignment notification
  const notifyAssignment = useCallback((recallId, assignedUserId) => {
    emit('recall_assignment', {
      recallId,
      assignedUserId,
      timestamp: new Date().toISOString()
    });
  }, [emit]);

  // Check connection status
  const checkConnection = useCallback(() => {
    return socketRef.current?.connected || false;
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-reconnect when authentication changes
  useEffect(() => {
    if (user && isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
  }, [user, isAuthenticated, connect, disconnect]);

  // Handle visibility change (reconnect when app becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isAuthenticated && !isConnected) {
        console.log('App became visible, attempting to reconnect...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isAuthenticated, isConnected, connect]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online, attempting to reconnect...');
      if (user && isAuthenticated && !isConnected) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Gone offline');
      setConnectionError('No internet connection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, isAuthenticated, isConnected, connect]);

  const value = {
    // State
    isConnected,
    connectionError,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    emit,
    addEventListener,
    
    // Helpers
    checkConnection,
    notifyRecallResponse,
    notifyAssignment
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
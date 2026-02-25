import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // If VITE_SOCKET_URL is set, connect to that URL (useful for production),
    // otherwise connect to the same origin and let Vite proxy /socket.io -> :4000 in dev.
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;

    const s = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return ctx.socket;
};



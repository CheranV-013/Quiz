import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Use explicit backend URL, overridable via VITE_API_URL.
    const socketUrl =
      import.meta.env.VITE_API_URL || 'https://quiz-2-lcqa.onrender.com';

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



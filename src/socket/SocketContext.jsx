import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketUrl = "https://quiz-2-lcqa.onrender.com"; // FORCE backend URL

    // ⭐ create socket connection
    const s = io(socketUrl, {
      transports: ["websocket"], // IMPORTANT
      withCredentials: true,
      autoConnect: true
    });

    // optional logs (safe)
    s.on("connect", () => {
      console.log("Socket connected:", s.id);
    });

    s.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    setSocket(s);

    // cleanup
    return () => {
      s.disconnect();
    };
  }, []);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);

  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return ctx.socket;
};
import { createContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

export const SocketContext = createContext(null);

// Opens a single authenticated Socket.io connection while a user is logged in,
// and tears it down on logout. Exposes the socket + a "connected" flag.
export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
      // No user — make sure any old socket is closed.
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Dev: same origin (Vite proxies /socket.io). Prod: connect to the backend
    // origin derived from VITE_API_URL (e.g. https://shoptalk-backend.onrender.com).
    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = apiUrl ? new URL(apiUrl).origin : undefined;
    const opts = { auth: { token }, autoConnect: true, withCredentials: true };
    const s = socketUrl ? io(socketUrl, opts) : io(opts);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) => console.warn("socket connect_error:", err.message));

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

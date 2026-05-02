import { useEffect, useRef } from "react";
import { connectSocket, disconnectSocket } from "../features/chat/socket";

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = connectSocket();
    return () => disconnectSocket();
  }, []);

  return socketRef.current;
}
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem('access_token');
  if (!token) return null;

  socket = io(URL, { auth: { token } });

  socket.on('connect_error', (err) => {
    console.error('[socket] connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

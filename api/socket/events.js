/**
 * Register Socket.io event handlers.
 * JWT auth is already verified by server.js middleware before reaching here.
 */
export function registerSocketEvents(io) {
  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    console.log(`[socket] connected: ${userId} (${role})`);

    // Driver: subscribe to new trip requests within a region
    socket.on('driver:watch', ({ lat, lng }) => {
      // Join a region room based on rough grid cell (~10km)
      const cell = `${Math.floor(lat / 0.1)}:${Math.floor(lng / 0.1)}`;
      socket.join(`region:${cell}`);
    });

    // Driver: send live location ping to their current rider
    socket.on('driver:location', ({ trip_id, lat, lng }) => {
      socket.to(`trip:${trip_id}`).emit('driver:location', { lat, lng });
    });

    // Both parties join a trip room on acceptance
    socket.on('trip:join', ({ trip_id }) => {
      socket.join(`trip:${trip_id}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${userId}`);
    });
  });
}

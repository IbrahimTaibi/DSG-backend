// Utility function to emit notifications via Socket.io
let io = null;

// Initialize the io instance
function setIO(ioInstance) {
  io = ioInstance;
}

// Emit notification to a specific user
function emitNotification(userId, notification) {
  if (!io) {
    console.warn("Socket.io not initialized, cannot emit notification");
    return;
  }

  try {
    io.to(userId.toString()).emit("new_notification", notification);
    console.log(`Notification emitted to user ${userId}:`, notification.type);
  } catch (error) {
    console.error("Error emitting notification:", error);
  }
}

// Emit notification to multiple users
function emitNotificationToUsers(userIds, notification) {
  if (!io) {
    console.warn("Socket.io not initialized, cannot emit notification");
    return;
  }

  try {
    userIds.forEach((userId) => {
      io.to(userId.toString()).emit("new_notification", notification);
    });
    console.log(
      `Notification emitted to ${userIds.length} users:`,
      notification.type,
    );
  } catch (error) {
    console.error("Error emitting notifications to users:", error);
  }
}

module.exports = {
  setIO,
  emitNotification,
  emitNotificationToUsers,
};

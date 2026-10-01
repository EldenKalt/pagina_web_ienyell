function getIo() {
  try {
    return require("../index").io;
  } catch (_error) {
    return null;
  }
}

function emitToConversation(conversation, event, payload, senderRole = null) {
  const io = getIo();
  if (!io) {
    return;
  }

  if (conversation.clientId && senderRole !== "CLIENT") {
    io.to(`user-${conversation.clientId}`).emit(event, payload);
  }

  if (conversation.assignedAgentId) {
    if (senderRole !== "ADMIN" && senderRole !== "COLABORADOR") {
      io.to(`user-${conversation.assignedAgentId}`).emit(event, payload);
    }
  } else {
    if (senderRole !== "ADMIN") {
      io.to("role-ADMIN").emit(event, payload);
    }
  }
}

module.exports = {
  emitToConversation
};

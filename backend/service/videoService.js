// backend/services/video-call-events.js

const handleVideoCallEvent = (socket, io, onlineUsers) => {
  // ─────────────────────────────────────────────
  // 1. Initiate call
  // ─────────────────────────────────────────────
  socket.on("initiate_call", ({ callId, callerId, receiverId, callType, callerInfo }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming_call", {
        callerId,
        callerName: callerInfo?.username,
        callerAvatar: callerInfo?.profilePicture,
        callId,
        callType,
      });
    } else {
      console.log(`server: Receiver ${receiverId} is offline`);
      socket.emit("call_failed", { reason: "user is offline" });
    }
  });

  // ─────────────────────────────────────────────
  // 2. Accept call
  // ─────────────────────────────────────────────
  socket.on("accept_call", ({ callId, callerId, receiverId, receiverInfo }) => {
    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call_accepted", {
        callId,
        receiverId,
        receiverName: receiverInfo?.username,
        receiverAvatar: receiverInfo?.profilePicture,
      });
    } else {
      console.log(`server: Caller ${callerId} is offline`);
    }
  });

  // ─────────────────────────────────────────────
  // 3. Reject / Decline call
  // ─────────────────────────────────────────────
  socket.on("reject_call", ({ callId, callerId }) => {
    const callerSocketId = onlineUsers.get(callerId);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call_rejected", { callId });
    }
  });

  // ─────────────────────────────────────────────
  // 4. End / Hang up call
  // ─────────────────────────────────────────────
  socket.on("end_call", ({ callId, participantId }) => {
    const participantSocketId = onlineUsers.get(participantId);

    if (participantSocketId) {
      io.to(participantSocketId).emit("call_ended", { callId });
    }
  });

  // ─────────────────────────────────────────────
  // 5. WebRTC Signaling
  // ─────────────────────────────────────────────

  // Offer
  socket.on("webrtc_offer", ({ callId, receiverId, offer }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_offer", {
        callId,
        offer,
        senderId: socket.userId,
      });
      console.log(`server: offer forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found for the offer`);
    }
  });

  // Answer
  socket.on("webrtc_answer", ({ callId, answer, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_answer", {
        callId,
        answer,
        senderId: socket.userId,
      });
      console.log(`server: answer forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found for the answer`);
    }
  });

  // ICE Candidate
  socket.on("webrtc_ice_candidate", ({ callId, candidate, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_ice_candidate", {
        callId,
        candidate,
        senderId: socket.userId,
      });
      console.log(`server: ICE candidate forwarded to ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} not found for the ICE candidate`);
    }
  });
};

module.exports = handleVideoCallEvent;  

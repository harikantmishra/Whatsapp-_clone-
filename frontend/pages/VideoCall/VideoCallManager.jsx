import { useEffect, useCallback } from "react";
import useVideoCallStore from "../../src/store/videoCallStore";
import useUserStore from "../../src/store/useUserStore";
import VideoCallModal from "./VideoCallModal";

const VideoCallManager = ({ socket }) => {
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
  } = useVideoCallStore();

  const { user } = useUserStore();

  useEffect(() => {
    if (!socket) return;

    // Incoming Call
    const handleIncomingCall = ({
      callerId,
      callerName,
      callerAvatar,
      callType,
      callId,
    }) => {
      setIncomingCall({
        callerId,
        callerName,
        callerAvatar,
        callId,
      });

      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus("ringing");
    };

    // Call Accepted
    const handleCallAccepted = ({ callId, receiverId }) => {
      console.log("Call accepted:", callId);
      if (receiverId) {
        setCurrentCall({
          ...useVideoCallStore.getState().currentCall,
          participantId: receiverId,
        });
      }
      setCallStatus("connected");
    };

    // Call Rejected
    const handleCallRejected = () => {
      endCall();
    };

    // Call Failed / Ended
    const handleCallFailed = ({ reason }) => {
      console.log(reason);

      setCallStatus("failed");

      setTimeout(() => {
        endCall();
      }, 2000);
    };

    // User Busy
    const handleUserBusy = () => {
      setCallStatus("busy");

      setTimeout(() => {
        endCall();
      }, 1500);
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_failed", handleCallFailed);
    socket.on("user_busy", handleUserBusy);
    socket.on("call_ended", handleCallRejected);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_failed", handleCallFailed);
      socket.off("user_busy", handleUserBusy);
      socket.off("call_ended", handleCallRejected);
    };
  }, [
    socket,
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
  ]);

  // Function to initiate a call
  const initiateCall = useCallback(
    (
      receiverId,
      receiverName,
      receiverAvatar,
      callType = "video"
    ) => {
      if (!socket || !user?._id) return;

      const callId = `${user._id}-${receiverId}-${Date.now()}`;

      const callData = {
        callId,
        participantId: receiverId,
        participantName: receiverName,
        participantAvatar: receiverAvatar,
      };

      // Update Zustand Store
      setCurrentCall(callData);
      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus("calling");

      // Notify receiver
      socket.emit("initiate_call", {
        callId,
        callerId: user._id,
        callerInfo: {
          username: user.username,
          profilePicture: user.profilePicture,
        },
        receiverId,
        callType,
      });
    },
    [
      socket,
      user,
      setCurrentCall,
      setCallType,
      setCallModalOpen,
      setCallStatus,
    ]
  );

  // Expose initiateCall through Zustand
  useEffect(() => {
    useVideoCallStore.setState({
      initiateCall,
    });
  }, [initiateCall]);

  return <VideoCallModal socket={socket} />;
};

export default VideoCallManager;

import { useEffect, useRef } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhone,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import useUserStore from "../../src/store/useUserStore";
import useVideoCallStore from "../../src/store/videoCallStore";

const rtcConfig = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ],
};

const VideoCallModal = ({ socket }) => {
  const {
    currentCall,
    incomingCall,
    isCallModalOpen,
    callType,
    callStatus,
    localStream,
    remoteStream,
    peerConnection,
    isVideoEnabled,
    isAudioEnabled,
    setCurrentCall,
    setIncomingCall,
    setCallActive,
    setCallType,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    setCallModalOpen,
    setCallStatus,
    addIceCandidate,
    processQueuedIceCandidates,
    toggleVideo,
    toggleAudio,
    endCall,
  } = useVideoCallStore();
  const { user } = useUserStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleCallAccepted = async ({ callId, receiverId }) => {
      const activeCall = useVideoCallStore.getState().currentCall;
      if (!activeCall || activeCall.callId !== callId) return;

      const nextTargetUserId = receiverId || activeCall.participantId;
      setCurrentCall({
        ...activeCall,
        participantId: nextTargetUserId,
      });
      setCallStatus("connecting");

      try {
        const connection = await ensurePeerConnection(nextTargetUserId);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);

        socket.emit("webrtc_offer", {
          callId,
          receiverId: nextTargetUserId,
          offer,
        });
      } catch (error) {
        console.error("Failed to create offer", error);
        setCallStatus("failed");
      }
    };

    const handleWebRtcOffer = async ({ callId, offer, senderId }) => {
      try {
        const activeIncomingCall = useVideoCallStore.getState().incomingCall;
        const activeCurrentCall = useVideoCallStore.getState().currentCall;
        const targetCall = activeIncomingCall?.callId === callId
          ? activeIncomingCall
          : activeCurrentCall?.callId === callId
            ? activeCurrentCall
            : null;

        if (!targetCall) return;

        const connection = await ensurePeerConnection(senderId);
        await connection.setRemoteDescription(offer);
        await processQueuedIceCandidates();

        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          callId,
          receiverId: senderId,
          answer,
        });

        setCurrentCall({
          ...targetCall,
          participantId: senderId,
        });
        setIncomingCall(null);
        setCallStatus("connected");
        setCallActive(true);
      } catch (error) {
        console.error("Failed to handle offer", error);
        setCallStatus("failed");
      }
    };

    const handleWebRtcAnswer = async ({ callId, answer }) => {
      const activeCall = useVideoCallStore.getState().currentCall;
      const connection = useVideoCallStore.getState().peerConnection;

      if (!activeCall || activeCall.callId !== callId || !connection) return;

      try {
        await connection.setRemoteDescription(answer);
        await processQueuedIceCandidates();
        setCallStatus("connected");
        setCallActive(true);
      } catch (error) {
        console.error("Failed to apply answer", error);
        setCallStatus("failed");
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      const connection = useVideoCallStore.getState().peerConnection;

      if (!connection || !connection.remoteDescription) {
        addIceCandidate(candidate);
        return;
      }

      try {
        await connection.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    };

    const handleCallEnded = ({ callId }) => {
      const activeCall = useVideoCallStore.getState().currentCall;
      const ringingCall = useVideoCallStore.getState().incomingCall;

      if (activeCall?.callId !== callId && ringingCall?.callId !== callId) return;
      endCall();
    };

    socket.on("call_accepted", handleCallAccepted);
    socket.on("webrtc_offer", handleWebRtcOffer);
    socket.on("webrtc_answer", handleWebRtcAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("webrtc_offer", handleWebRtcOffer);
      socket.off("webrtc_answer", handleWebRtcAnswer);
      socket.off("webrtc_ice_candidate", handleIceCandidate);
      socket.off("call_ended", handleCallEnded);
    };
  }, [
    addIceCandidate,
    endCall,
    processQueuedIceCandidates,
    setCallActive,
    setCallStatus,
    setCurrentCall,
    setIncomingCall,
    socket,
  ]);

  const ensureLocalStream = async () => {
    const store = useVideoCallStore.getState();

    if (store.localStream) {
      return store.localStream;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: store.callType === "video",
      audio: true,
    });

    setLocalStream(stream);
    return stream;
  };

  const ensurePeerConnection = async (targetUserId) => {
    const store = useVideoCallStore.getState();
    if (store.peerConnection) return store.peerConnection;

    const stream = await ensureLocalStream();
    const connection = new RTCPeerConnection(rtcConfig);
    const nextRemoteStream = new MediaStream();

    setRemoteStream(nextRemoteStream);

    stream.getTracks().forEach((track) => {
      connection.addTrack(track, stream);
    });

    connection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        nextRemoteStream.addTrack(track);
      });
      setRemoteStream(nextRemoteStream);
    };

    connection.onicecandidate = (event) => {
      if (!event.candidate || !socket) return;

      socket.emit("webrtc_ice_candidate", {
        callId: useVideoCallStore.getState().currentCall?.callId,
        receiverId: targetUserId,
        candidate: event.candidate,
      });
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;

      if (state === "connected") {
        setCallStatus("connected");
        setCallActive(true);
      }

      if (state === "failed" || state === "disconnected" || state === "closed") {
        endCall();
      }
    };

    setPeerConnection(connection);
    return connection;
  };

  const participant = incomingCall || currentCall || null;

  useEffect(() => {
    if (!isCallModalOpen) return undefined;

    ensureLocalStream().catch((error) => {
      console.error("Unable to access camera or microphone", error);
      setCallStatus("failed");
    });

    return undefined;
  }, [isCallModalOpen, callType, setCallStatus]);

  if (!isCallModalOpen || !participant) {
    return null;
  }

  const rejectCall = () => {
    if (!socket) {
      endCall();
      return;
    }

    socket.emit("reject_call", {
      callId: participant.callId,
      callerId: participant.callerId,
    });

    endCall();
  };

  const acceptCall = async () => {
    if (!socket || !incomingCall || !user?._id) return;

    setCurrentCall({
      callId: incomingCall.callId,
      participantId: incomingCall.callerId,
      participantName: incomingCall.callerName,
      participantAvatar: incomingCall.callerAvatar,
    });
    setCallStatus("connecting");

    try {
      await ensurePeerConnection(incomingCall.callerId);

      socket.emit("accept_call", {
        callId: incomingCall.callId,
        callerId: incomingCall.callerId,
        receiverId: user._id,
        receiverInfo: {
          username: user.username,
          profilePicture: user.profilePicture,
        },
      });
    } catch (error) {
      console.error("Failed to accept call", error);
      setCallStatus("failed");
    }
  };

  const hangUp = () => {
    const otherUserId =
      currentCall?.participantId || incomingCall?.callerId || incomingCall?.participantId;

    if (socket && participant.callId && otherUserId) {
      socket.emit("end_call", {
        callId: participant.callId,
        participantId: otherUserId,
      });
    }

    endCall();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div className="flex h-[min(85vh,640px)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] bg-[#111b21] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src={participant.participantAvatar || participant.callerAvatar}
              alt={participant.participantName || participant.callerName || "Call participant"}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {participant.participantName || participant.callerName || "Unknown user"}
              </p>
              <p className="text-sm text-gray-300">
                {callStatus === "ringing"
                  ? "Incoming call"
                  : callStatus === "calling"
                    ? "Calling..."
                    : callStatus === "connecting"
                      ? "Connecting..."
                      : callStatus === "connected"
                        ? "Connected"
                        : callStatus === "failed"
                          ? "Call failed"
                          : callStatus}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-200">
            {callType || "video"}
          </span>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 bg-[#0b141a] p-4 md:grid-cols-[1fr_280px]">
          <div className="relative min-h-[260px] overflow-hidden rounded-[28px] bg-black">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-gray-400">
                Waiting for the other participant to join...
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-[28px] bg-[#1f2c34]">
            {callType === "video" && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-center text-gray-300">
                <img
                  src={user?.profilePicture || participant.participantAvatar || participant.callerAvatar}
                  alt="You"
                  className="h-20 w-20 rounded-full object-cover"
                />
                <p className="text-sm">
                  {callType === "audio" ? "Audio call in progress" : "Camera preview unavailable"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/10 px-6 py-5">
          {callStatus === "ringing" ? (
            <>
              <button
                type="button"
                onClick={acceptCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400"
              >
                <FaPhone />
              </button>
              <button
                type="button"
                onClick={rejectCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400"
              >
                <FaPhoneSlash />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAudio}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                  isAudioEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                disabled={callType !== "video"}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
                  callType !== "video"
                    ? "cursor-not-allowed bg-white/5 text-gray-500"
                    : isVideoEnabled
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button
                type="button"
                onClick={hangUp}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400"
              >
                <FaPhoneSlash />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;

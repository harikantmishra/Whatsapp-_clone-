import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInHours, format } from "date-fns";
import {
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaPlus,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import useThemeStore from "../../src/store/themeStore";
import useUserStore from "../../src/store/useUserStore";
import useStatusStore from "../../src/store/useStatusStore";

const formatStatusTime = (timestamp) => {
  const date = new Date(timestamp);
  const includeDate = differenceInHours(new Date(), date) >= 24;
  return includeDate ? format(date, "dd MMM yyyy, HH:mm") : format(date, "HH:mm");
};

const Status = () => {
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    loading,
    statuses,
    statusViewers,
    fetchStatuses,
    createStatus,
    viewStatus,
    deleteStatus,
    getStatusViewers,
    getUserStatuses,
    getOtherStatuses,
    initializeSocket,
    cleanupSocket,
    clearError,
  } = useStatusStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewGroup, setPreviewGroup] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const myStatuses = getUserStatuses(user?._id);
  const otherStatuses = getOtherStatuses(user?._id);
  const otherViewerCount = statusViewers.filter((viewer) => viewer._id !== user?._id).length;

  useEffect(() => {
    fetchStatuses();
    initializeSocket();

    return () => {
      cleanupSocket();
      clearError();
    };
  }, [fetchStatuses, initializeSocket, cleanupSocket, clearError]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const currentStatus = useMemo(
    () => previewGroup?.statuses?.[currentStatusIndex] || null,
    [previewGroup, currentStatusIndex],
  );

  useEffect(() => {
    if (!previewGroup || !currentStatus) return undefined;

    if (currentStatus.contentType === "video") {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (currentStatusIndex < previewGroup.statuses.length - 1) {
        const nextIndex = currentStatusIndex + 1;
        setCurrentStatusIndex(nextIndex);
        viewStatus(previewGroup.statuses[nextIndex]._id).catch(() => {});
      } else {
        setPreviewGroup(null);
        setCurrentStatusIndex(0);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentStatus, currentStatusIndex, previewGroup, viewStatus]);

  useEffect(() => {
    if (!videoRef.current || currentStatus?.contentType !== "video") return undefined;

    const video = videoRef.current;
    const handleEnded = () => {
      if (previewGroup && currentStatusIndex < previewGroup.statuses.length - 1) {
        const nextIndex = currentStatusIndex + 1;
        setCurrentStatusIndex(nextIndex);
        viewStatus(previewGroup.statuses[nextIndex]._id).catch(() => {});
      } else {
        setPreviewGroup(null);
        setCurrentStatusIndex(0);
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [currentStatus, currentStatusIndex, previewGroup, viewStatus]);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedFile(null);
    setNewStatus("");
  };

  const handleCreateStatus = async () => {
    if (!newStatus.trim() && !selectedFile) return;

    await createStatus({
      content: newStatus,
      file: selectedFile,
    });

    closeCreateModal();
  };

  const openStatusPreview = async (group, index = 0) => {
    setPreviewGroup(group);
    setCurrentStatusIndex(index);
    setShowActions(false);
    setShowViewers(false);

    if (group.statuses[index]?._id) {
      await viewStatus(group.statuses[index]._id);
    }
  };

  const closePreview = () => {
    setPreviewGroup(null);
    setCurrentStatusIndex(0);
    setShowActions(false);
    setShowViewers(false);
  };

  const movePreview = async (direction) => {
    if (!previewGroup) return;

    const nextIndex = currentStatusIndex + direction;
    if (nextIndex < 0 || nextIndex >= previewGroup.statuses.length) return;

    setCurrentStatusIndex(nextIndex);
    await viewStatus(previewGroup.statuses[nextIndex]._id);
  };

  const handleOpenViewers = async () => {
    if (!currentStatus?._id) return;
    await getStatusViewers(currentStatus._id);
    setShowViewers(true);
  };

  const handleDeleteCurrentStatus = async () => {
    if (!currentStatus?._id) return;
    await deleteStatus(currentStatus._id);

    const remainingStatuses = previewGroup.statuses.filter((status) => status._id !== currentStatus._id);

    if (!remainingStatuses.length) {
      closePreview();
      return;
    }

    setPreviewGroup({
      ...previewGroup,
      statuses: remainingStatuses,
    });
    setCurrentStatusIndex((index) => Math.min(index, remainingStatuses.length - 1));
    setShowActions(false);
  };

  const panelClass =
    theme === "dark"
      ? "border-[#2a3942] bg-[#111b21] text-white"
      : "border-gray-200 bg-white text-[#111b21]";

  const surfaceClass = theme === "dark" ? "bg-[#202c33]" : "bg-[#f0f2f5]";
  const subtleText = theme === "dark" ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`flex h-full min-h-0 flex-col ${panelClass}`}>
      <div className={`flex items-center justify-between border-b px-5 py-4 ${panelClass}`}>
        <div>
          <h1 className="text-xl font-semibold">Status</h1>
          <p className={`text-sm ${subtleText}`}>Share updates that disappear after 24 hours.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-full bg-green-500 p-3 text-white transition hover:bg-green-600"
        >
          <FaPlus />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <div className={`h-full min-h-0 overflow-y-auto ${panelClass}`}>
          <div className="border-b border-inherit p-4">
            <button
              type="button"
              onClick={() => (myStatuses ? openStatusPreview(myStatuses) : setShowCreateModal(true))}
              className={`flex w-full items-center gap-3 rounded-3xl p-3 text-left transition ${
                theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"
              }`}
            >
              <img
                src={user?.profilePicture}
                alt={user?.username || "You"}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-green-500/80"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">My Status</p>
                <p className={`truncate text-sm ${subtleText}`}>
                  {myStatuses?.statuses?.length
                    ? `${myStatuses.statuses.length} update${myStatuses.statuses.length > 1 ? "s" : ""}`
                    : "Tap to add status update"}
                </p>
              </div>
            </button>
          </div>

          <div className="p-4">
            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${subtleText}`}>
              Recent Updates
            </p>

            {loading && statuses.length === 0 ? (
              <p className={`text-sm ${subtleText}`}>Loading statuses...</p>
            ) : otherStatuses.length === 0 ? (
              <p className={`text-sm ${subtleText}`}>No status updates available yet.</p>
            ) : (
              <div className="space-y-2">
                {otherStatuses.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => openStatusPreview(group)}
                    className={`flex w-full items-center gap-3 rounded-3xl p-3 text-left transition ${
                      theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={group.user?.profilePicture}
                      alt={group.user?.username || "User"}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-green-500/80"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{group.user?.username || "User"}</p>
                      <p className={`truncate text-sm ${subtleText}`}>
                        {formatStatusTime(group.statuses[group.statuses.length - 1]?.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className={`w-full max-w-xl rounded-[28px] p-6 shadow-2xl ${surfaceClass}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Status</h2>
              <button type="button" onClick={closeCreateModal}>
                <FaTimes />
              </button>
            </div>

            <textarea
              rows={4}
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
              placeholder="Write something..."
              className={`mt-5 w-full rounded-3xl p-4 outline-none ${
                theme === "dark" ? "bg-[#111b21] text-white" : "bg-white text-[#111b21]"
              }`}
            />

            {previewUrl && (
              <div className="mt-4 overflow-hidden rounded-3xl">
                {selectedFile?.type.startsWith("video/") ? (
                  <video src={previewUrl} controls className="max-h-80 w-full object-cover" />
                ) : (
                  <img src={previewUrl} alt="Status preview" className="max-h-80 w-full object-cover" />
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-full px-4 py-2 ${theme === "dark" ? "bg-[#111b21]" : "bg-white"}`}
                >
                  Choose File
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreateStatus}
                className="rounded-full bg-green-500 px-5 py-2 text-white transition hover:bg-green-600"
              >
                Post Status
              </button>
            </div>
          </div>
        </div>
      )}

      {previewGroup && currentStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
          <div className="absolute left-0 right-0 top-0 flex gap-1 px-5 pt-4">
            {previewGroup.statuses.map((status, index) => (
              <div key={status._id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-full ${
                    index <= currentStatusIndex ? "w-full bg-white" : "w-0 bg-white"
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="absolute left-6 right-6 top-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={previewGroup.user?.profilePicture}
                alt={previewGroup.user?.username || "User"}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="text-white">
                <p className="font-semibold">{previewGroup.user?.username || "User"}</p>
                <p className="text-sm text-gray-300">{formatStatusTime(currentStatus.createdAt)}</p>
              </div>
            </div>

            <div className="relative flex items-center gap-4 text-white">
              {previewGroup.id === user?._id && (
                <button type="button" onClick={() => setShowActions((value) => !value)}>
                  <FaEye />
                </button>
              )}
              <button type="button" onClick={closePreview}>
                <FaTimes size={20} />
              </button>

              {showActions && (
                <div className="absolute right-10 top-10 min-w-48 overflow-hidden rounded-2xl bg-[#202c33] shadow-xl">
                  <button
                    type="button"
                    onClick={handleOpenViewers}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
                  >
                    <FaEye />
                    Viewers
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCurrentStatus}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
                  >
                    <FaTrash />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => movePreview(-1)}
            disabled={currentStatusIndex === 0}
            className="absolute left-6 rounded-full bg-white/10 p-4 text-white disabled:opacity-30"
          >
            <FaChevronLeft />
          </button>

          <div className="mx-auto max-h-[85vh] max-w-[85vw] overflow-hidden rounded-[28px]">
            {currentStatus.contentType === "image" && (
              <img
                src={currentStatus.content}
                alt="Status"
                className="max-h-[85vh] max-w-[85vw] object-contain"
              />
            )}

            {currentStatus.contentType === "video" && (
              <video
                ref={videoRef}
                src={currentStatus.content}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[85vw] object-contain"
              />
            )}

            {currentStatus.contentType === "text" && (
              <div className="flex min-h-[360px] min-w-[320px] items-center justify-center rounded-[28px] bg-[#202c33] p-10 text-center text-3xl text-white">
                {currentStatus.content}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => movePreview(1)}
            disabled={currentStatusIndex >= previewGroup.statuses.length - 1}
            className="absolute right-6 rounded-full bg-white/10 p-4 text-white disabled:opacity-30"
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {showViewers && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
          <div className={`w-full max-w-md rounded-[28px] p-6 shadow-2xl ${surfaceClass}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Viewed By</h3>
              <button type="button" onClick={() => setShowViewers(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {statusViewers.map((viewer, index) => {
                const isOwner = viewer._id === user?._id || index === 0;

                return (
                  <div
                    key={viewer._id}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 ${
                      theme === "dark" ? "bg-[#111b21]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={viewer.profilePicture}
                        alt={viewer.username}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{viewer.username}</p>
                        <p className={`text-xs ${subtleText}`}>
                          {isOwner ? "You posted this status" : "Viewed your status"}
                        </p>
                      </div>
                    </div>
                    {isOwner && (
                      <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-600">
                        Author
                      </span>
                    )}
                  </div>
                );
              })}

              {otherViewerCount === 0 && (
                <p className={`px-1 text-sm ${subtleText}`}>No one else has viewed this status yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Status;

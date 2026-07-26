import React, { useEffect, useState } from "react";
import { FaEllipsisV, FaPlus } from "react-icons/fa";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import useStatusStore from "../../store/useStatusStore";

const Status = () => {
  const [previewContact, setPreviewContact] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showOption, setShowOption] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [filePreview, setFilePreview] = useState(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  // Status Store
  const {
    statuses,
    loading,
    error,
    fetchStatuses,
    createStatus,
    viewStatus,
    deleteStatus,
    getStatusViewers,
    getUserStatuses,
    getOtherStatuses,
    clearError,
    reset,
    initializeSocket,
  } = useStatusStore();

  const userStatuses= getUserStatuses(user?._id)
  const getOtherStatuses = getOtherStatuses(user?._id);

  useEffect(() => {
    fetchStatuses();
    initializeSocket();
    return ()=>{
        cleanupSocket
    }
  }, [user?._id]);


  // clear the error when page is mounts

  useEffect(()=>{
    return ()=> clearError();
  },[])

    const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setSelectedFile(file);
    setShowFileMenu(false);

    if (
      file.type.startsWith("image/") ||
      file.type.startsWith("video/")
    ) {
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatus.trim() && !selectedFile) return;

    try {
      await createStatus({
        content: newStatus,
        file: selectedFile,
      });

      setNewStatus("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating status", error);
    }
  };

  

   const handleViewStatus = async (statusId) => {
    try {
      await viewStatus(statusId);
    } catch (error) {
      console.error("Error viewing status", error);
    }
  };
 

    const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      setShowOption(false);
    } catch (error) {
      console.error("Error deleting status", error);
    }
  };
    const handleGetStatusViewers = async (statusId) => {
    try {
      const viewers = await getStatusViewers(statusId);
      setStatusViewers(viewers || []);
      setShowViewers(true);
    } catch (error) {
      console.error(error);
    }
  };
  const handlePreviewClose = () => {
  setPreviewContact(null);
  setCurrentStatusIndex(0);
};
const handlePreviewNext = () => {
  if (
    currentStatusIndex <
    previewContact.statuses.length - 1
  ) {
    const nextIndex = currentStatusIndex + 1;

    setCurrentStatusIndex(nextIndex);

    handleViewStatus(
      previewContact.statuses[nextIndex]._id
    );
  } else {
    handlePreviewClose();
  }
};
const handlePreviewPrev = () => {
  if (currentStatusIndex > 0) {
    const prevIndex = currentStatusIndex - 1;

    setCurrentStatusIndex(prevIndex);

    handleViewStatus(
      previewContact.statuses[prevIndex]._id
    );
  }
};
const handleStatusPreview = async (
  contact,
  statusIndex = 0
) => {
  setPreviewContact(contact);
  setCurrentStatusIndex(statusIndex);

  if (contact.statuses?.[statusIndex]) {
    await handleViewStatus(
      contact.statuses[statusIndex]._id
    );
  }
};
useEffect(() => {
  if (!previewContact) return;

  const currentStatus =
    previewContact.statuses[currentStatusIndex];

  if (
    currentStatus?.mediaType === "image" ||
    currentStatus?.mediaType === "text"
  ) {
    const timer = setTimeout(() => {
      handlePreviewNext();
    }, 5000);

    return () => clearTimeout(timer);
  }
}, [previewContact, currentStatusIndex]);

const videoRef = useRef(null);

useEffect(() => {
  if (!videoRef.current) return;

  const video = videoRef.current;

  const handleEnded = () => {
    handlePreviewNext();
  };

  video.addEventListener("ended", handleEnded);

  return () => {
    video.removeEventListener("ended", handleEnded);
  };
}, [previewContact, currentStatusIndex]);


useEffect(() => {
  const handleKeyDown = (e) => {
    if (!previewContact) return;

    if (e.key === "ArrowRight") {
      handlePreviewNext();
    }

    if (e.key === "ArrowLeft") {
      handlePreviewPrev();
    }

    if (e.key === "Escape") {
      handlePreviewClose();
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [previewContact, currentStatusIndex]);


const progressPercentage = previewContact
  ? ((currentStatusIndex + 1) /
      previewContact.statuses.length) *
    100
  : 0;

  const currentStatus = previewContact
  ? previewContact.statuses[currentStatusIndex]
  : null;


  const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};



  return (
  <div className="flex h-full bg-[#111b21] text-white">

    {/* Left Sidebar */}
    <div className="w-[380px] border-r border-[#2a3942] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a3942]">
        <h2 className="text-xl font-semibold">Status</h2>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-500 hover:bg-green-600 p-3 rounded-full"
        >
          <FaPlus />
        </button>
      </div>

      {/* My Status */}
      <div className="p-3 border-b border-[#2a3942]">
        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <img
              src={user?.profilePic}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />

            <div>
              <h3 className="font-semibold">My Status</h3>
              <p className="text-sm text-gray-400">
                Tap to add status update
              </p>
            </div>

          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-500 rounded-full p-2"
          >
            <FaPlus />
          </button>

        </div>
      </div>

      {/* Recent Updates */}
      <div className="flex-1 overflow-y-auto">

        <p className="px-4 py-2 text-sm text-gray-400 uppercase">
          Recent Updates
        </p>

        {statuses?.length === 0 && (
          <p className="text-center mt-10 text-gray-400">
            No Status Available
          </p>
        )}

        {statuses?.map((contact) => (

          <div
            key={contact.user._id}
            onClick={() => handleStatusPreview(contact)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] cursor-pointer"
          >

            <img
              src={contact.user.profilePic}
              alt=""
              className="w-14 h-14 rounded-full border-2 border-green-500 object-cover"
            />

            <div>

              <h3 className="font-medium">
                {contact.user.fullName}
              </h3>

              <p className="text-sm text-gray-400">
                {formatTime(contact.statuses[0].createdAt)}
              </p>

            </div>

          </div>

        ))}

      </div>

    </div>

    {showCreateModal && (

<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

<div className="bg-[#202c33] rounded-xl w-[500px] p-6">

<div className="flex justify-between items-center">

<h2 className="text-xl font-semibold">
Create Status
</h2>

<button onClick={()=>setShowCreateModal(false)}>
<FaTimes />
</button>

</div>

<textarea
className="w-full mt-5 bg-[#111b21] rounded-lg p-3 outline-none"
rows={4}
placeholder="Write something..."
value={newStatus}
onChange={(e)=>setNewStatus(e.target.value)}
/>

{filePreview && (

<div className="mt-4">

{selectedFile?.type.startsWith("image") ? (

<img
src={filePreview}
className="rounded-lg max-h-72 mx-auto"
/>

):(

<video
src={filePreview}
controls
className="rounded-lg max-h-72 mx-auto"
/>

)}

</div>

)}

<div className="flex justify-between mt-6">

<div>

<input
type="file"
hidden
ref={fileInputRef}
accept="image/*,video/*"
onChange={handleFileChange}
/>

<button
onClick={()=>fileInputRef.current.click()}
className="px-4 py-2 bg-[#2a3942] rounded-lg"
>
Choose File
</button>

</div>

<button
onClick={handleCreateStatus}
className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg"
>
Post Status
</button>

</div>

</div>

</div>

)}
{showOption && (

<div className="absolute top-16 right-4 bg-[#202c33] rounded-lg shadow-lg">

<button
onClick={()=>
handleDeleteStatus(currentStatus._id)
}
className="flex items-center gap-3 px-5 py-3 hover:bg-[#2a3942] w-full"
>

<FaTrash />

Delete Status

</button>

<button
onClick={()=>{
handleGetStatusViewers(currentStatus._id)
}}
className="flex items-center gap-3 px-5 py-3 hover:bg-[#2a3942] w-full"
>

<FaEye />

Viewers

</button>

</div>

)}
{previewContact && currentStatus && (
  <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">

    {/* Progress Bars */}
    <div className="absolute top-5 left-0 right-0 px-8 flex gap-1">
      {previewContact.statuses.map((_, index) => (
        <div
          key={index}
          className="flex-1 h-1 bg-gray-600 rounded overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-500 ${
              index < currentStatusIndex
                ? "w-full bg-white"
                : index === currentStatusIndex
                ? "w-full bg-white animate-pulse"
                : "w-0"
            }`}
          />
        </div>
      ))}
    </div>

    {/* Header */}
    <div className="absolute top-10 left-8 right-8 flex justify-between items-center">

      <div className="flex items-center gap-3">
        <img
          src={previewContact.user.profilePic}
          alt=""
          className="w-10 h-10 rounded-full object-cover"
        />

        <div>
          <h3 className="font-semibold">
            {previewContact.user.fullName}
          </h3>

          <p className="text-sm text-gray-300">
            {formatTime(currentStatus.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">

        {previewContact.user._id === user._id && (
          <button onClick={() => setShowOption(!showOption)}>
            <FaEllipsisV size={18} />
          </button>
        )}

        <button onClick={handlePreviewClose}>
          <FaTimes size={22} />
        </button>

      </div>
    </div>

    {/* Previous */}
    <button
      onClick={handlePreviewPrev}
      className="absolute left-6"
    >
      <FaChevronLeft size={28} />
    </button>

    {/* Content */}

    {currentStatus.mediaType === "image" && (
      <img
        src={currentStatus.media}
        alt=""
        className="max-h-[90%] max-w-[80%] rounded-lg"
      />
    )}

    {currentStatus.mediaType === "video" && (
      <video
        ref={videoRef}
        src={currentStatus.media}
        controls
        autoPlay
        className="max-h-[90%] max-w-[80%] rounded-lg"
      />
    )}

    {currentStatus.mediaType === "text" && (
      <div className="bg-[#202c33] p-10 rounded-xl text-2xl max-w-xl text-center">
        {currentStatus.content}
      </div>
    )}

    {/* Next */}
    <button
      onClick={handlePreviewNext}
      className="absolute right-6"
    >
      <FaChevronRight size={28} />
    </button>

  </div>
)}

{showViewers && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

    <div className="bg-[#202c33] w-[420px] rounded-xl p-5">

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">
          Viewed By
        </h2>

        <button onClick={() => setShowViewers(false)}>
          <FaTimes />
        </button>
      </div>

      {statusViewers.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          No views yet
        </p>
      ) : (
        statusViewers.map((viewer) => (
          <div
            key={viewer._id}
            className="flex items-center gap-3 py-3 border-b border-[#2a3942]"
          >
            <img
              src={viewer.profilePic}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />

            <span>{viewer.fullName}</span>
          </div>
        ))
      )}

    </div>
  </div>
)}
  </div>
);
};

export default Status;
import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessagesById,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const [previewImage, setPreviewImage] = useState(null);
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessagesById(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessagesById,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleImageClick = (imgUrl) => {
    setPreviewImage(imgUrl);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const renderMessages = () => (
    <>
      <div className="p-4 space-y-4 min-h-[200px] h-full overflow-y-auto bg-base-100">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.senderId === authUser._id
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`
              max-w-[80%] rounded-xl p-3 shadow-sm
              ${
                message.senderId === authUser._id
                  ? "bg-primary text-primary-content"
                  : "bg-base-200"
              }
            `}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                  onClick={() => handleImageClick(message.image)}
                />
              )}
              {message.text && <p className="text-sm">{message.text}</p>}
              <p
                className={`
                text-[10px] mt-1.5
                ${
                  message.senderId === authUser._id
                    ? "text-primary-content/70"
                    : "text-base-content/70"
                }
              `}
              >
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={closePreview}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="md:max-w-[50%] md:max-h-[50%] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()} // Prevent closing on image click
          />
        </div>
      )}
    </>
  );

  if (isMessagesLoading) {
    return (
      <div className="flex flex-col h-full">
        <ChatHeader />
        <div className="flex-1 overflow-y-auto">
          <MessageSkeleton />
        </div>
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader />
      {renderMessages()}
      <MessageInput />
    </div>
  );
};

export default ChatContainer;

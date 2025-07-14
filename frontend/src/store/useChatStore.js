import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import io from "socket.io-client";

export const useChatStore = create((set, get) => {
  const { socket } = useAuthStore.getState();

  return {
    socket,
    messages: [],
    users: [],
    selectedUser: null,
    isMessagesLoading: false,
    isUsersLoading: false,
    unreadMessages: {},
    getUsersList: async () => {
      set({ isUsersLoading: true });
      try {
        const response = await axiosInstance.get("/message");
        set({ users: response.data });
      } catch (error) {
        console.log("Error getting users list", error);
        toast.error(error.response?.data?.message || "Failed to fetch users");
      } finally {
        set({ isUsersLoading: false });
      }
    },
    getUnreadMessageCount: async (userId) => {
      try {
        const response = await axiosInstance.get(`/message/unread/${userId}`);
        const { unreadMessages } = get();
        set({
          unreadMessages: {
            ...unreadMessages,
            [userId]: response.data.count,
          },
        });
      } catch (error) {
        console.log("Error getting unread message count", error);
        toast.error(error.response.data.message);
      }
    },
    getMessagesById: async (userToChatId) => {
      if (!userToChatId) {
        console.log("No user ID provided");
        return;
      }

      set({ isMessagesLoading: true });
      try {
        // First mark messages as read in the backend
        await axiosInstance.patch(`/message/read/${userToChatId}`);

        // Then fetch the messages
        const response = await axiosInstance.get(`/message/${userToChatId}`);
        set({ messages: response.data });

        // Update unread count to 0 for this user
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [userToChatId]: 0,
          },
        }));

        // Refresh unread counts for all users to ensure consistency
        const { users } = get();
        if (users?.length) {
          users.forEach((user) => {
            get().getUnreadMessageCount(user._id);
          });
        }
      } catch (error) {
        console.error("Error in getMessagesById:", error);
        if (error.response?.status !== 401) {
          toast.error(
            error.response?.data?.message || "Failed to fetch messages"
          );
        }
      } finally {
        set({ isMessagesLoading: false });
      }
    },
    sendMessage: async (messageData) => {
      const { selectedUser, messages } = get();
      try {
        const response = await axiosInstance.post(
          `/message/send/${selectedUser._id}`,
          messageData
        );
        set({ messages: [...messages, response.data] });
      } catch (error) {
        console.log("Error sending message", error);
        toast.error(error.response.data.message);
      }
    },
    subscribeToMessages: () => {
      const { socket } = useAuthStore.getState();

      if (!socket) {
        console.error("Socket not initialized");
        return () => {}; // Return empty cleanup function
      }

      // Clean up any existing listeners to prevent duplicates
      socket.off("newMessage");

      const messageHandler = async (newMessage) => {
        console.log("New message received:", newMessage);
        const state = get();
        const { selectedUser: currentSelectedUser, users } = state;

        // If the message is from the current chat, just add it and mark as read
        if (currentSelectedUser?._id === newMessage.senderId) {
          // Add the new message
          set((state) => ({
            messages: [...state.messages, newMessage],
            unreadMessages: {
              ...state.unreadMessages,
              [newMessage.senderId]: 0,
            },
          }));

          // Mark as read in the backend
          try {
            await axiosInstance.patch(`/message/read/${newMessage.senderId}`);

            // After marking as read, refresh unread counts for all users
            if (users?.length) {
              await Promise.all(
                users.map((user) => get().getUnreadMessageCount(user._id))
              );
            }
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        } else {
          // For messages from other chats, update the unread count immediately
          // First, update the UI immediately for better UX
          set((state) => ({
            unreadMessages: {
              ...state.unreadMessages,
              [newMessage.senderId]:
                (state.unreadMessages[newMessage.senderId] || 0) + 1,
            },
          }));

          // Then verify with the server and update all unread counts
          try {
            // First update the count for the current sender
            const response = await axiosInstance.get(
              `/message/unread/${newMessage.senderId}`
            );
            console.log(
              "Verified unread count from server:",
              response.data.count
            );

            // Update the specific sender's count
            set((state) => ({
              unreadMessages: {
                ...state.unreadMessages,
                [newMessage.senderId]: response.data.count,
              },
            }));

            // Then refresh all unread counts to ensure consistency
            if (users?.length) {
              await Promise.all(
                users.map((user) => get().getUnreadMessageCount(user._id))
              );
            }
          } catch (error) {
            console.error("Error verifying unread count:", error);
            // Keep the local increment if server verification fails
          }
        }
      };

      // Set up the socket listener
      socket.on("newMessage", messageHandler);
      console.log("Subscribed to new messages");

      // Return cleanup function
      return () => {
        console.log("Cleaning up message listener");
        socket.off("newMessage", messageHandler);
      };
    },
    unsubscribeFromMessages: () => {
      const { socket } = useAuthStore.getState();
      if (socket) {
        socket.off("newMessage");
      }
    },
    setSelectedUser: async (selectedUser) => {
      // If selectedUser is null, just clear the selection
      if (!selectedUser) {
        // Clear any existing message listeners
        const { socket } = useAuthStore.getState();
        if (socket) {
          socket.off("newMessage");
        }

        // Update state immediately
        set({
          selectedUser: null,
          messages: [],
          isMessagesLoading: false,
        });

        // Refresh unread counts for all users
        const { users } = get();
        if (users?.length) {
          try {
            await Promise.all(
              users.map((user) => get().getUnreadMessageCount(user._id))
            );
          } catch (error) {
            console.error("Error refreshing unread counts:", error);
          }
        }
        return;
      }

      // If selectedUser is provided but has no ID, log error and return
      if (!selectedUser._id) {
        console.error("No user ID provided");
        return;
      }

      // Clear previous subscriptions immediately
      const { socket } = useAuthStore.getState();
      if (socket) {
        socket.off("newMessage");
      }

      // Set loading state and selected user immediately
      set({
        selectedUser,
        messages: [],
        isMessagesLoading: true,
        unreadMessages: {
          ...get().unreadMessages,
          [selectedUser._id]: 0, // Optimistically set to 0
        },
      });

      // Start all async operations in parallel
      try {
        // Run mark as read and fetch messages in parallel
        await Promise.all([
          // Mark messages as read in the backend
          axiosInstance.patch(`/message/read/${selectedUser._id}`),
          
          // Fetch messages for the selected user
          get().getMessagesById(selectedUser._id),
          
          // Refresh unread counts for all users
          (async () => {
            const { users } = get();
            if (users?.length) {
              await Promise.all(
                users.map((user) => get().getUnreadMessageCount(user._id))
              );
            }
          })(),
        ]);
      } catch (error) {
        console.error("Error in setSelectedUser:", error);
        if (error.response?.status !== 401) {
          toast.error("Failed to load messages");
        }
      } finally {
        set({ isMessagesLoading: false });
      }

      // Subscribe to new messages immediately (no delay needed)
      const freshSocket = useAuthStore.getState().socket;
      if (freshSocket) {
        get().subscribeToMessages();
      }
    },
  };
});

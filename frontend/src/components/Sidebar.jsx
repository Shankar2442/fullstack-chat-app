import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, BellDot } from "lucide-react";

const Sidebar = () => {
  const { 
    getUsersList, 
    users, 
    selectedUser, 
    setSelectedUser, 
    isUsersLoading,
    getUnreadMessageCount,
    unreadMessages
  } = useChatStore();

  console.log("unreadMessgae", unreadMessages)

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsersList();
  }, [getUsersList]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Get unread message counts for each user
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (users?.length) {
        // Use Promise.all to fetch all unread counts in parallel
        await Promise.all(
          users.map(user => getUnreadMessageCount(user._id))
        );
      }
    };

    // Initial fetch
    fetchUnreadCounts();

    // Refresh counts every 30 seconds to handle any missed updates
    const interval = setInterval(fetchUnreadCounts, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [users, getUnreadMessageCount]);

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full md:w-80 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium md:block">Contacts</span>
          </div>
          {Object.values(unreadMessages).some(count => count > 0) && (
            <BellDot className="size-5 text-primary" />
          )}
        </div>
        {/* TODO: Online filter toggle */}
        <div className="mt-3 flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex md:items-center gap-3
              hover:bg-base-300 transition-colors
              ${
                selectedUser?._id === user._id
                  ? "bg-base-300 ring-1 ring-base-300"
                  : ""
              }
            `}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="avatar size-10">
                  <img
                    src={user.avatar || "/avatar.png"}
                    alt={user.name}
                    className="object-cover rounded-full"
                  />
                </div>
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                      rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{user.fullName}</h3>
                <p className="text-sm opacity-50">{onlineUsers.includes(user._id) ? "Online" : "Offline"}</p>
              </div>
              {unreadMessages[user._id] > 0 && (
                <div className="badge badge-primary badge-sm">
                  {unreadMessages[user._id]}
                </div>
              )}
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;

import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";
import ChatContainer from "../components/ChatContainer.jsx";

const Home = () => {
  const { selectedUser } = useChatStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Listen for screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderMobileView = () => {
    if (!selectedUser) {
      return <Sidebar />;
    }
    return <ChatContainer />;
  };

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          {/* Desktop layout */}
          <div className="hidden md:flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>

          {/* Mobile layout */}
          <div className="md:hidden h-full rounded-lg overflow-hidden">
            {!selectedUser ? <Sidebar /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

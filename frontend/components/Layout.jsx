import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChatWindow from "../pages/ChatSection/chatWindow.jsx";
import useLayoutStore from "../src/store/LayoutStore";
import useThemeStore from "../src/store/themeStore";

const Layout = ({ children }) => {
  const location = useLocation();
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore((state) => state.setSelectedContact);
  const { theme } = useThemeStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isChatsRoute = location.pathname === "/";
  const shouldRenderChatWindow =
    isChatsRoute || location.pathname === "/user-profile" || location.pathname === "/setting" || location.pathname === "/status";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isChatsRoute) {
      setSelectedContact(null);
    }
  }, [isChatsRoute, setSelectedContact]);

  const showChatWindow = shouldRenderChatWindow && (selectedContact || !isMobile);
  const showPrimaryPane = !selectedContact || !isMobile || !shouldRenderChatWindow;

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100 text-black"
      }`}
    >
      {!isMobile && <Sidebar />}
      <div className="flex h-full min-w-0 flex-1 overflow-hidden">
        {showPrimaryPane && (
          <div
            className={`h-full min-h-0 ${
              isMobile ? "w-full pb-16" : "w-full shrink-0 md:w-[380px] md:max-w-[40%]"
            }`}
          >
            {children}
          </div>
        )}
        {showChatWindow && (
          <div className={`h-full min-h-0 min-w-0 flex-1 ${isMobile ? "pb-16" : ""}`}>
            <ChatWindow
              selectedContact={selectedContact}
              setSelectedContact={setSelectedContact}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
      {isMobile && <Sidebar />}
    </div>
  );
};

export default Layout;

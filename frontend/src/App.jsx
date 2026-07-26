import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./user-login/loginn.jsx";
import Homepage from "../components/Homepage.jsx";
import UserDetials from "../components/UserDetails.jsx";
import Status from "../pages/StatusSection/status.jsx";
import Setting from "../pages/SettingSection/setting.jsx";
import Layout from "../components/Layout.jsx";
import { ProtectedRoute, PublicRoute } from "../protected.jsx";
import useUserStore from "./store/useUserStore.js";
import { useChatStore } from "./store/chatStore.js";
import { disconnectSocket, initializeSocket } from "./services/chatService.js";

function App() {
  const user = useUserStore((state) => state.user);
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const initSocketListeners = useChatStore((state) => state.initSocketListeners);
  const cleanup = useChatStore((state) => state.cleanup);

  useEffect(() => {
    if (user?._id) {
      const socket = initializeSocket();

      if (socket) {
        setCurrentUser(user);
        initSocketListeners();
      }
    }

    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [user, setCurrentUser, initSocketListeners, cleanup]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Homepage />} />
            <Route path="/user-profile" element={<Layout><UserDetials /></Layout>} />
            <Route path="/status" element={<Layout><Status /></Layout>} />
            <Route path="/setting" element={<Layout><Setting /></Layout>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

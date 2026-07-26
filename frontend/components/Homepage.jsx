import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "./Layout";
import ChatList from "../pages/ChatSection/chatList.jsx";
import { getAllUsers } from "../src/services/userServices.js";

const HomePage = () => {
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const result = await getAllUsers();
        setAllUsers(result?.users || result?.data || []);
      } catch (error) {
        console.log(error);
        setAllUsers([]);
      }
    };

    loadUsers();
  }, []);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="h-full min-h-0"
      >
        <ChatList contacts={allUsers} />
      </motion.div>
    </Layout>
  );
};

export default HomePage;

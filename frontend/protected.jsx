import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./src/store/useUserStore";
import { checkUserAuth } from "./src/services/userServices";
import Loader from "./components/Loader";

const needsProfileCompletion = (user) =>
  Boolean(user?._id) && (!user?.username || !user?.profilePicture);

export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, user, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();

        if (result?.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.error(error);
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) return <Loader />;

  if (!isAuthenticated) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  if (needsProfileCompletion(user)) {
    return <Navigate to="/user-login" replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useUserStore();

  if (needsProfileCompletion(user)) {
    return <Outlet />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

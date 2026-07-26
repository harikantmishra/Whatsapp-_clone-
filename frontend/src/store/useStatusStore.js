import { create } from "zustand";
import { axiosInstance } from "../services/axios.service";
import { getSocket } from "../services/chat.service";

const groupStatusesByUser = (statuses) =>
  statuses.reduce((accumulator, status) => {
    const statusUserId = status.user?._id;
    if (!statusUserId) return accumulator;

    if (!accumulator[statusUserId]) {
      accumulator[statusUserId] = {
        id: statusUserId,
        user: status.user,
        statuses: [],
      };
    }

    accumulator[statusUserId].statuses.push(status);
    accumulator[statusUserId].statuses.sort(
      (first, second) =>
        new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime(),
    );

    return accumulator;
  }, {});

const useStatusStore = create((set, get) => ({
  statuses: [],
  loading: false,
  error: null,
  statusViewers: [],

  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("new_status");
    socket.off("status_deleted");
    socket.off("status_viewed");

    socket.on("new_status", (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((status) => status._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    });

    socket.on("status_deleted", ({ statusId }) => {
      set((state) => ({
        statuses: state.statuses.filter((status) => status._id !== statusId),
      }));
    });

    socket.on("status_viewed", ({ statusId, viewers }) => {
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId
            ? {
                ...status,
                viewers,
              }
            : status,
        ),
      }));
    });
  },

  cleanupSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("new_status");
    socket.off("status_deleted");
    socket.off("status_viewed");
  },

  fetchStatuses: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await axiosInstance.get("/status");

      set({
        statuses: Array.isArray(data?.data) ? data.data : [],
        loading: false,
      });
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  createStatus: async ({ content, file }) => {
    set({ loading: true, error: null });

    try {
      const formData = new FormData();

      if (file) {
        formData.append("media", file);
      }

      if (content?.trim()) {
        formData.append("content", content.trim());
      }

      const { data } = await axiosInstance.post("/status", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const createdStatus = data?.data;

      set((state) => ({
        statuses: createdStatus && !state.statuses.some((status) => status._id === createdStatus._id)
          ? [createdStatus, ...state.statuses]
          : state.statuses,
        loading: false,
      }));

      return createdStatus;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      throw error;
    }
  },

  viewStatus: async (statusId) => {
    try {
      const { data } = await axiosInstance.put(`/status/${statusId}/view`);
      const updatedStatus = data?.data;

      if (updatedStatus?._id) {
        set((state) => ({
          statuses: state.statuses.map((status) =>
            status._id === updatedStatus._id ? updatedStatus : status,
          ),
        }));
      }

      return updatedStatus;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  deleteStatus: async (statusId) => {
    try {
      await axiosInstance.delete(`/status/${statusId}`);

      set((state) => ({
        statuses: state.statuses.filter((status) => status._id !== statusId),
      }));
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  getStatusViewers: async (statusId) => {
    try {
      const { data } = await axiosInstance.get(`/status/${statusId}/viewers`);
      const viewers = Array.isArray(data?.data) ? data.data : [];

      set({ statusViewers: viewers });
      return viewers;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error.message,
      });
      throw error;
    }
  },

  getGroupedStatuses: () => Object.values(groupStatusesByUser(get().statuses)),

  getUserStatuses: (userId) =>
    get()
      .getGroupedStatuses()
      .find((group) => group.id === userId) || null,

  getOtherStatuses: (userId) =>
    get()
      .getGroupedStatuses()
      .filter((group) => group.id !== userId),

  clearError: () => set({ error: null }),

  resetState: () =>
    set({
      statuses: [],
      loading: false,
      error: null,
      statusViewers: [],
    }),
}));

export default useStatusStore;

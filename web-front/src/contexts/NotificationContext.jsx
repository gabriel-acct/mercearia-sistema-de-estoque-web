import { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback(({ type = "error", message, duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const error = useCallback((msg) => addNotification({ type: "error", message: msg }), [addNotification]);
  const success = useCallback((msg) => addNotification({ type: "success", message: msg }), [addNotification]);
  const info = useCallback((msg) => addNotification({ type: "info", message: msg }), [addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, error, success, info }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto rounded-xl shadow-xl border p-4 animate-slide-in"
            style={{
              backgroundColor: n.type === "error" ? "#FEF2F2" : n.type === "success" ? "#F0FDF4" : "#EFF6FF",
              borderColor: n.type === "error" ? "#FECACA" : n.type === "success" ? "#BBF7D0" : "#BFDBFE",
              color: n.type === "error" ? "#991B1B" : n.type === "success" ? "#166534" : "#1E40AF",
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: n.type === "error" ? "#FECACA" : n.type === "success" ? "#BBF7D0" : "#BFDBFE",
                }}
              >
                {n.type === "error" ? "!" : n.type === "success" ? "✓" : "i"}
              </span>
              <p className="text-sm font-medium flex-1">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      error: (m) => console.error(m),
      success: (m) => console.log(m),
      info: (m) => console.info(m),
    };
  }
  return ctx;
}

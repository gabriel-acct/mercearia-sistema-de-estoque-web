import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";

export default function ProtectedRoute({ children, areaId }) {
  const { user, loading, podeAcessar } = useAuth();
  const { error } = useNotification();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0F172A" }}
      >
        <div className="animate-pulse text-white font-medium">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (areaId != null && !podeAcessar(areaId)) {
    error("Você não tem permissão para acessar esta área.");
    return <Navigate to="/" replace />;
  }

  return children;
}

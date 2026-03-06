import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Pdv from "./pages/Pdv";
import Estoque from "./pages/Estoque";
import Funcionarios from "./pages/Funcionarios";
import RelatorioVendas from "./pages/RelatorioVendas";
import Configuracoes from "./pages/Configuracoes";
import TabelaCores from "./pages/TabelaCores";

function App() {
  const { user, loading } = useAuth();

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

  return (
    <div>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="/pdv" element={<Pdv />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/relatorios" element={<RelatorioVendas />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/tabela-cores" element={<TabelaCores />} />
      </Routes>
    </div>
  );
}

export default App;

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AREAS, AREAS_CONFIG } from "../constants/areas";
import {
  IconBox,
  IconDollar,
  IconCalculator,
  IconUsers,
  IconSettings,
  IconX,
} from "../components/Icons";

const ICONS = {
  [AREAS.PDV]: IconCalculator,
  [AREAS.ESTOQUE]: IconBox,
  [AREAS.FUNCIONARIOS]: IconUsers,
  [AREAS.RELATORIOS]: IconDollar,
  [AREAS.CONFIGURACOES]: IconSettings,
};

export default function Home() {
  const { user, loading, logout, podeAcessar } = useAuth();
  const navigate = useNavigate();

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
    navigate("/login");
    return null;
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#0F172A" }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: "#1A1A1A" }}
      >
        <h1 className="text-xl font-bold text-white">Mercearia — Sistema de Estoque</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            {user.nome}{" "}
            <span className="text-slate-500">
              ({user.cargo_nome ?? user.cargo_id ?? "—"})
            </span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: "#64748B", color: "#FFFFFF" }}
          >
            <IconX size={16} />
            Sair
          </button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-slate-400 mb-8">Escolha uma opção abaixo</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {AREAS_CONFIG.map((card) => {
            const temAcesso = podeAcessar(card.id);
            const Icon = ICONS[card.id];
            return (
              <Link
                key={card.id}
                to={temAcesso ? card.path : "#"}
                onClick={(e) => !temAcesso && e.preventDefault()}
                className={`rounded-2xl p-6 transition-all block ${
                  temAcesso ? "hover:scale-[1.02] cursor-pointer" : "opacity-50 cursor-not-allowed"
                }`}
                style={{
                  backgroundColor: temAcesso ? "#1E293B" : "#1A1A1A",
                  border: "1px solid #334155",
                }}
              >
                {Icon && (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: temAcesso ? "#2563EB" : "#475569", color: "#FFFFFF" }}
                  >
                    <Icon size={24} />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-1">{card.titulo}</h3>
                <p className="text-sm text-slate-400">{card.descricao}</p>
                {!temAcesso && (
                  <p className="text-xs text-amber-500 mt-2">Sem permissão</p>
                )}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

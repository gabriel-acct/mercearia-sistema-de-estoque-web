import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { get, post } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";

export default function Login() {
  const { login } = useAuth();
  const { success, error } = useNotification();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      error("Sessão expirada. Faça login novamente.");
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await get("/users");
        let userList = [];
        if (Array.isArray(data)) userList = data;
        else if (data?.users) userList = Array.isArray(data.users) ? data.users : [data.users];
        else if (data?.user) userList = Array.isArray(data.user) ? data.user : [data.user];
        else if (data && typeof data === "object" && (data.nome || data.name || data.username || data.id)) userList = [data];
        if (userList.length > 0) {
          setUsers(userList);
        } else {
          setUsers([{ nome: "erro1", id: "erro1" }, { nome: "erro2", id: "erro2" }]);
        }
      } catch {
        setUsers([{ nome: "erro1", id: "erro1" }, { nome: "erro2", id: "erro2" }]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUser && password) {
      try {
        const data = await post("/auth", { username: selectedUser.nome, password });
        if (data?.status === true && data?.access_token) {
          login(data.access_token);
          success("Login realizado com sucesso.");
          setTimeout(() => {
            window.location.href = "/";
          }, 500);
        } else {
          error(data?.message ?? "Credenciais inválidas.");
        }
      } catch (err) {
        const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao fazer login.";
        error(msg);
      }
    }
  };

  const getUserName = (u) => u?.nome ?? u?.name ?? u?.username ?? u?.id ?? String(u);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8 md:p-10 border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Mercearia</h1>
            <p className="text-slate-600 mt-1">Sistema de Estoque</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">
                Usuário
              </label>
              {loading ? (
                <div className="h-12 rounded-lg bg-slate-100 animate-pulse flex items-center justify-center">
                  <span className="text-slate-500 text-sm">Carregando...</span>
                </div>
              ) : (
                <select
                  value={selectedUser ? JSON.stringify(selectedUser) : ""}
                  onChange={(e) => setSelectedUser(e.target.value ? JSON.parse(e.target.value) : null)}
                  className="w-full h-12 px-4 rounded-lg border-2 border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 bg-white"
                  required
                >
                  <option value="">Selecione um usuário</option>
                  {users.map((u, i) => (
                    <option key={u?.id ?? i} value={JSON.stringify(u)}>
                      {getUserName(u)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-lg border-2 border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30 active:scale-[0.98]"
            >
              Entrar
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Acesse seu painel de controle
          </p>
        </div>
      </div>
    </div>
  );
}

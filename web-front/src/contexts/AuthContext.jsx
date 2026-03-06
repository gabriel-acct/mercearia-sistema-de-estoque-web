import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { get } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregarUsuario = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await get("/protected");
      const info = data?.user_info ?? data?.user ?? data;
      // areas_ids = array de IDs de áreas que o cargo pode acessar (ex: [1, 2, 4])
      const areasIds = info?.areas_ids ?? info?.areas ?? [];
      setUser({
        id: info?.id,
        nome: info?.nome ?? info?.usuario ?? info?.username,
        cargo_id: info?.cargo_id ?? info?.cargo,
        cargo_nome: info?.cargo_nome ?? info?.cargo_nome,
        areas_ids: Array.isArray(areasIds) ? areasIds : [],
      });
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuario();
  }, [carregarUsuario]);

  const login = useCallback((token) => {
    localStorage.setItem("token", token);
    carregarUsuario();
  }, [carregarUsuario]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  /**
   * Verifica se o usuário pode acessar uma área pelo ID (nivel de acesso)
   * @param {number} areaId - ID da área (1=PDV, 2=Estoque, 3=Funcionários, 4=Relatórios)
   */
  const podeAcessar = useCallback(
    (areaId) => {
      if (!user) return false;
      return user.areas_ids?.includes(Number(areaId)) ?? false;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, podeAcessar, carregarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

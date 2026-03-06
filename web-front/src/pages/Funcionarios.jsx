import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { get, post, put, del } from "../services/api";
import { useNotification } from "../contexts/NotificationContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { AREAS } from "../constants/areas";
import { IconX, IconPlus, IconTrash2 } from "../components/Icons";

const CARGOS = ["admin", "gerente", "caixa", "estoque"];

function ModalFuncionario({ aberto, onFechar, funcionario, onSalvar }) {
  const { success, error } = useNotification();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("caixa");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (funcionario) {
      setUsuario(funcionario.usuario ?? funcionario.nome ?? "");
      setSenha("");
      setCargo(funcionario.cargo ?? funcionario.role ?? "caixa");
    } else {
      setUsuario("");
      setSenha("");
      setCargo("caixa");
    }
  }, [funcionario, aberto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario || !cargo) {
      error("Usuário e cargo são obrigatórios.");
      return;
    }
    if (!funcionario && !senha) {
      error("Senha é obrigatória para novo funcionário.");
      return;
    }
    setLoading(true);
    try {
      const body = funcionario
        ? { usuario, cargo, ...(senha && { senha }) }
        : { usuario, senha, cargo };
      if (funcionario?.id) {
        await put(`/funcionarios/${funcionario.id}`, body);
        success("Funcionário atualizado com sucesso.");
      } else {
        await post("/funcionarios", body);
        success("Funcionário adicionado com sucesso.");
      }
      onSalvar();
      onFechar();
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao salvar.";
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: "#1A1A1A", borderColor: "#F5F5F5" }}
        >
          <h2 className="text-lg font-bold text-white">
            {funcionario ? "Editar funcionário" : "Adicionar funcionário"}
          </h2>
          <button onClick={onFechar} className="text-white hover:opacity-80 p-1">
            <IconX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Usuário *</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required
              disabled={!!funcionario?.id}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">
              Senha {funcionario ? "(deixe em branco para manter)" : "*"}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required={!funcionario}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Cargo *</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
            >
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-2 rounded-lg font-medium border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FuncionariosContent() {
  const { success, error } = useNotification();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [funcEdit, setFuncEdit] = useState(null);

  async function carregar() {
    setLoading(true);
    try {
      const data = await get("/funcionarios");
      const lista = Array.isArray(data) ? data : data?.funcionarios ?? data?.users ?? [];
      setFuncionarios(lista);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao carregar funcionários.";
      error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleExcluir(f) {
    if (!window.confirm(`Excluir funcionário "${f.usuario ?? f.nome}"?`)) return;
    try {
      await del(`/funcionarios/${f.id}`);
      success("Funcionário excluído.");
      carregar();
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao excluir.";
      error(msg);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F172A" }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: "#1A1A1A" }}
      >
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white hover:opacity-80 font-medium">
            ← Voltar
          </Link>
          <h1 className="text-xl font-bold text-white">Funcionários</h1>
        </div>
        <button
          onClick={() => {
            setFuncEdit(null);
            setModalAberto(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          <IconPlus size={18} />
          Adicionar funcionário
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        ) : funcionarios.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center text-slate-400">
            Nenhum funcionário cadastrado.
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden shadow-xl">
            <table className="w-full">
              <thead style={{ backgroundColor: "#1A1A1A", color: "#FFFFFF" }}>
                <tr>
                  <th className="text-left py-4 px-4 font-semibold">Usuário</th>
                  <th className="text-left py-4 px-4 font-semibold">Cargo</th>
                  <th className="text-right py-4 px-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => (
                  <tr key={f.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      {f.usuario ?? f.nome ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {f.cargo_nome ?? f.role ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setFuncEdit(f);
                          setModalAberto(true);
                        }}
                        className="text-blue-600 hover:underline text-sm mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(f)}
                        className="text-red-600 hover:underline text-sm inline-flex items-center gap-1"
                      >
                        <IconTrash2 size={14} />
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <ModalFuncionario
        aberto={modalAberto}
        onFechar={() => {
          setModalAberto(false);
          setFuncEdit(null);
        }}
        funcionario={funcEdit}
        onSalvar={carregar}
      />
    </div>
  );
}

export default function Funcionarios() {
  return (
    <ProtectedRoute areaId={AREAS.FUNCIONARIOS}>
      <FuncionariosContent />
    </ProtectedRoute>
  );
}

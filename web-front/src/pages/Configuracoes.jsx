import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { get, post, put, del } from "../services/api";
import { useNotification } from "../contexts/NotificationContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { AREAS, AREAS_CONFIG } from "../constants/areas";
import {
  IconSettings,
  IconX,
  IconPlus,
  IconTrash2,
  IconUsers,
} from "../components/Icons";

function Card({ titulo, descricao, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
    >
      <div
        className="px-6 py-4 border-b"
        style={{ borderColor: "#334155", backgroundColor: "#0F172A" }}
      >
        <h3 className="text-lg font-bold text-white">{titulo}</h3>
        <p className="text-sm text-slate-400 mt-0.5">{descricao}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ModalCargo({ aberto, onFechar, cargo, onSalvar }) {
  const { success, error } = useNotification();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cargo) {
      setNome(cargo.nome ?? "");
      setDescricao(cargo.descricao ?? "");
    } else {
      setNome("");
      setDescricao("");
    }
  }, [cargo, aberto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      error("Nome do cargo é obrigatório.");
      return;
    }
    setLoading(true);
    try {
      if (cargo?.id) {
        await put(`/cargos/${cargo.id}`, { nome: nome.trim(), descricao });
        success("Cargo atualizado.");
      } else {
        await post("/cargos", { nome: nome.trim(), descricao });
        success("Cargo criado.");
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
          style={{ backgroundColor: "#1A1A1A" }}
        >
          <h2 className="text-lg font-bold text-white">
            {cargo ? "Editar cargo" : "Criar cargo"}
          </h2>
          <button onClick={onFechar} className="text-white hover:opacity-80 p-1">
            <IconX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: supervisor"
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Acessa PDV e Relatórios"
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
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

function ConfiguracoesContent() {
  const { success, error } = useNotification();
  const [cargos, setCargos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [modalCargo, setModalCargo] = useState(false);
  const [cargoEdit, setCargoEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregarCargos() {
    try {
      const data = await get("/cargos");
      setCargos(Array.isArray(data) ? data : data?.cargos ?? []);
    } catch {
      setCargos([]);
    }
  }

  async function carregarFuncionarios() {
    try {
      const data = await get("/funcionarios");
      setFuncionarios(
        Array.isArray(data) ? data : data?.funcionarios ?? data?.users ?? []
      );
    } catch {
      setFuncionarios([]);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([carregarCargos(), carregarFuncionarios()]).finally(() =>
      setLoading(false)
    );
  }, []);

  async function handleAtribuirCargo(funcId, cargoId) {
    try {
      await put(`/funcionarios/${funcId}/cargo`, { cargo_id: Number(cargoId) });
      success("Cargo atribuído com sucesso.");
      carregarFuncionarios();
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.msg ??
        "Erro ao atribuir cargo.";
      error(msg);
    }
  }

  async function handleExcluirCargo(c) {
    if (!window.confirm(`Excluir cargo "${c.nome}"?`)) return;
    try {
      await del(`/cargos/${c.id}`);
      success("Cargo excluído.");
      carregarCargos();
      carregarFuncionarios();
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.msg ??
        "Erro ao excluir.";
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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <IconSettings size={24} />
            Configurações
          </h1>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Documentação API */}
        <Card
          titulo="Documentação da API"
          descricao="Formato de retorno esperado pelo frontend"
        >
          <p className="text-slate-400 text-sm mb-4">
            O arquivo <strong className="text-white">API_DOCUMENTACAO.txt</strong> na raiz do
            projeto lista todos os endpoints e formatos de resposta esperados pelo frontend.
          </p>
          <a
            href="/API_DOCUMENTACAO.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-blue-400 hover:bg-blue-500/10 transition-colors border border-blue-500/30"
          >
            Abrir documentação (nova aba)
          </a>
        </Card>

        {/* Criar Cargo */}
        <Card
          titulo="Cargos"
          descricao="Criar, editar e excluir cargos do sistema"
        >
          {loading ? (
            <p className="text-slate-400">Carregando...</p>
          ) : (
            <>
              <button
                onClick={() => {
                  setCargoEdit(null);
                  setModalCargo(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium mb-4"
                style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
              >
                <IconPlus size={18} />
                Criar cargo
              </button>
              <div className="space-y-2">
                {cargos.length === 0 ? (
                  <p className="text-slate-500">Nenhum cargo cadastrado.</p>
                ) : (
                  cargos.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ backgroundColor: "#0F172A" }}
                    >
                      <div>
                        <span className="font-medium text-white">{c.nome}</span>
                        {c.descricao && (
                          <span className="text-slate-400 text-sm ml-2">
                            — {c.descricao}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCargoEdit(c);
                            setModalCargo(true);
                          }}
                          className="text-blue-400 hover:underline text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluirCargo(c)}
                          className="text-red-400 hover:underline text-sm inline-flex items-center gap-1"
                        >
                          <IconTrash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </Card>

        {/* Atribuir Cargo a Funcionário */}
        <Card
          titulo="Atribuir cargo a funcionário"
          descricao="Selecione o cargo de cada funcionário"
        >
          {loading ? (
            <p className="text-slate-400">Carregando...</p>
          ) : funcionarios.length === 0 ? (
            <p className="text-slate-500">Nenhum funcionário cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {funcionarios.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl flex-wrap"
                  style={{ backgroundColor: "#0F172A" }}
                >
                  <div className="flex items-center gap-2">
                    <IconUsers size={18} style={{ color: "#64748B" }} />
                    <span className="font-medium text-white">
                      {f.usuario ?? f.nome ?? "—"}
                    </span>
                  </div>
                  <select
                    value={f.cargo_id ?? f.cargo ?? ""}
                    onChange={(e) =>
                      handleAtribuirCargo(f.id, e.target.value)
                    }
                    className="px-3 py-2 rounded-lg border-2 bg-slate-800 text-white border-slate-600 focus:border-blue-500 outline-none min-w-[140px]"
                  >
                    <option value="">Selecione o cargo</option>
                    {cargos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Permissões por cargo (referência) */}
        <Card
          titulo="Áreas do sistema"
          descricao="ID de cada área para configuração no banco (tabela cargo_areas)"
        >
          <div className="grid gap-2">
            {AREAS_CONFIG.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: "#0F172A" }}
              >
                <span className="text-white">{a.titulo}</span>
                <span
                  className="px-2 py-0.5 rounded text-sm font-mono"
                  style={{ backgroundColor: "#334155", color: "#94A3B8" }}
                >
                  area_id = {a.id}
                </span>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-4">
            Configure no banco: INSERT INTO cargo_areas (cargo_id, area_id) VALUES
            (id_cargo, id_area);
          </p>
        </Card>
      </main>

      <ModalCargo
        aberto={modalCargo}
        onFechar={() => {
          setModalCargo(false);
          setCargoEdit(null);
        }}
        cargo={cargoEdit}
        onSalvar={carregarCargos}
      />
    </div>
  );
}

export default function Configuracoes() {
  return (
    <ProtectedRoute areaId={AREAS.CONFIGURACOES}>
      <ConfiguracoesContent />
    </ProtectedRoute>
  );
}

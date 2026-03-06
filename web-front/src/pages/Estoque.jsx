import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { get, post, put, del } from "../services/api";
import { useNotification } from "../contexts/NotificationContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { AREAS } from "../constants/areas";
import {
  IconBox,
  IconPlus,
  IconX,
  IconSearch,
  IconTrash2,
} from "../components/Icons";

function formatarPreco(val) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val ?? 0);
}

function ModalProduto({ aberto, onFechar, produto, onSalvar }) {
  const { success, error } = useNotification();
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ref, setRef] = useState("");
  const [ref2, setRef2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (produto) {
      setNome(produto.name_produto ?? produto.nome ?? "");
      setPreco(String(produto.preco ?? ""));
      setQuantidade(String(produto.quantidade ?? ""));
      setCodigo(produto.codigo ?? "");
      setRef(produto.ref ?? "");
      setRef2(produto.ref2 ?? "");
    } else {
      setNome("");
      setPreco("");
      setQuantidade("");
      setCodigo("");
      setRef("");
      setRef2("");
    }
  }, [produto, aberto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome || !preco || !codigo) {
      error("Nome, preço e código são obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        name_produto: nome,
        preco: parseFloat(preco) || 0,
        preco_custo: parseFloat(precoCusto) || 0,
        quantidade: parseInt(quantidade, 10) || 0,
        codigo,
        ref: ref || null,
        ref2: ref2 || null,
      };
      if (produto?.id) {
        await put(`/produtos/${produto.id}`, body);
        success("Produto atualizado com sucesso.");
      } else {
        await post("/produtos", body);
        success("Produto adicionado com sucesso.");
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
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: "#1A1A1A", borderColor: "#F5F5F5" }}
        >
          <h2 className="text-lg font-bold text-white">
            {produto ? "Editar produto" : "Adicionar produto"}
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
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Preço (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Preço de custo (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={precoCusto}
              onChange={(e) => setPrecoCusto(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Quantidade</label>
            <input
              type="number"
              min="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Código *</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
              required
              disabled={!!produto?.id}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Ref</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Ref2</label>
            <input
              type="text"
              value={ref2}
              onChange={(e) => setRef2(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-600 outline-none"
            />
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

function EstoqueContent() {
  const { success, error } = useNotification();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEdit, setProdutoEdit] = useState(null);

  async function carregarProdutos() {
    setLoading(true);
    try {
      const data = await get("/produtos");
      const lista = Array.isArray(data) ? data : data?.produtos ?? [];
      setProdutos(lista);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao carregar produtos.";
      error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const filtrados = busca
    ? produtos.filter(
        (p) =>
          String(p.name_produto ?? p.nome ?? "")
            .toLowerCase()
            .includes(busca.toLowerCase()) ||
          String(p.codigo ?? "").includes(busca) ||
          String(p.ref ?? "").includes(busca)
      )
    : produtos;

  async function handleExcluir(p) {
    if (!window.confirm(`Excluir "${p.name_produto ?? p.nome}"?`)) return;
    try {
      await del(`/produtos/${p.id}`);
      success("Produto excluído.");
      carregarProdutos();
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
          <Link
            to="/"
            className="text-white hover:opacity-80 font-medium"
          >
            ← Voltar
          </Link>
          <h1 className="text-xl font-bold text-white">Área de Estoque</h1>
        </div>
        <button
          onClick={() => {
            setProdutoEdit(null);
            setModalAberto(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          <IconPlus size={18} />
          Adicionar produto
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="relative mb-6 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: "#64748B" }} />
          <input
            type="text"
            placeholder="Buscar por nome, código ou ref..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 bg-white text-slate-900 border-slate-200 focus:border-blue-600 outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center text-slate-400">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden shadow-xl">
            <table className="w-full">
              <thead style={{ backgroundColor: "#1A1A1A", color: "#FFFFFF" }}>
                <tr>
                  <th className="text-left py-4 px-4 font-semibold">Nome</th>
                  <th className="text-left py-4 px-4 font-semibold">Código</th>
                  <th className="text-left py-4 px-4 font-semibold">Preço</th>
                  <th className="text-left py-4 px-4 font-semibold">Qtd</th>
                  <th className="text-right py-4 px-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      {p.name_produto ?? p.nome ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.codigo ?? "—"}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      {formatarPreco(p.preco ?? p.price)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.quantidade ?? "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setProdutoEdit(p);
                          setModalAberto(true);
                        }}
                        className="text-blue-600 hover:underline text-sm mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(p)}
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

      <ModalProduto
        aberto={modalAberto}
        onFechar={() => {
          setModalAberto(false);
          setProdutoEdit(null);
        }}
        produto={produtoEdit}
        onSalvar={carregarProdutos}
      />
    </div>
  );
}

export default function Estoque() {
  return (
    <ProtectedRoute areaId={AREAS.ESTOQUE}>
      <EstoqueContent />
    </ProtectedRoute>
  );
}

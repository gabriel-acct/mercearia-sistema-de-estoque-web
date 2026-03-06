import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { get, post } from "../services/api";
import { useNotification } from "../contexts/NotificationContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { AREAS } from "../constants/areas";
import {
  IconBox,
  IconDollar,
  IconCalculator,
  IconSearch,
  IconX,
  IconPlus,
  IconMinus,
  IconTrash2,
  IconCheck,
} from "../components/Icons";

// Ajuste o caminho se necessário (../constants/colors ou ../styles/colors)
import { colors } from "../constants/colors";

/** Utilitário de moeda */
function formatarPreco(val) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val ?? 0);
}

/** Modal base (reaproveitado) */
function Modal({ aberto, onFechar, titulo, children }) {
  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onFechar}
    >
      <div
        className="rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.branco }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            borderColor: colors.brancoFumaca,
            background: `linear-gradient(90deg, ${colors.pretoSuave}, ${colors.pretoAzulado})`,
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: colors.branco }}>
            {titulo}
          </h2>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: colors.branco }}
          >
            <IconX />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

/** Input de pagamento */
function InputPagamento({ label, value, setValue }) {
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: colors.azulSuave }}>
      <p className="text-sm" style={{ color: colors.cinzaClaro }}>
        {label}
      </p>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full mt-2 px-3 py-2 rounded-lg border"
        style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
      />
    </div>
  );
}

/**
 * FinalizarModal
 * - agora faz o POST para /vendas diretamente, usando `itens` (carrinho) passado pelo pai
 * - ao sucesso, chama onConfirm(response) para que o pai limpe o carrinho / exiba notificações adicionais
 */
function FinalizarModal({ aberto, onFechar, onConfirm, valorBruto, itens }) {
  const [desconto, setDesconto] = useState(0);
  const [dinheiro, setDinheiro] = useState(0);
  const [pix, setPix] = useState(0);
  const [credito, setCredito] = useState(0);
  const [debito, setDebito] = useState(0);
  const [loading, setLoading] = useState(false);

  const { success, error } = useNotification();

  const toNumber = (v) => {
    const s = String(v ?? "0").replace(",", ".").trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const valorBrutoNum = toNumber(valorBruto);
  const descontoNum = Math.max(0, toNumber(desconto));
  const valorLiquido = Math.max(0, Number((valorBrutoNum - descontoNum).toFixed(2)));

  const totalPago = Number(
    (toNumber(dinheiro) + toNumber(pix) + toNumber(credito) + toNumber(debito)).toFixed(2)
  );

  const troco = Number(Math.max(0, toNumber(dinheiro) - valorLiquido).toFixed(2));
  const falta = Number(Math.max(0, valorLiquido - totalPago).toFixed(2));

  const podeConfirmar = totalPago >= valorLiquido && valorLiquido > 0 && itens && itens.length > 0;

  async function handleConfirm() {
    if (!podeConfirmar || loading) return;
    setLoading(true);

    const payload = {
      itens: itens,
      total: Number(valorLiquido.toFixed(2)),
      pagamentos: {
        valor_bruto: Number(valorBrutoNum.toFixed(2)),
        desconto: Number(descontoNum.toFixed(2)),
        valor_liquido: Number(valorLiquido.toFixed(2)),
        total_dinheiro: Number(toNumber(dinheiro).toFixed(2)),
        total_pix: Number(toNumber(pix).toFixed(2)),
        total_credito: Number(toNumber(credito).toFixed(2)),
        total_debito: Number(toNumber(debito).toFixed(2)),
        total_troco: Number(troco.toFixed(2)),
      },
    };

    try {
      const resp = await post("/vendas", payload);
      // assume resposta com { status: true } ou similar; ajuste conforme API
      if (resp?.status || resp?.ok || resp?.success) {
        success?.("Venda finalizada com sucesso");
        // avisa o pai para limpar carrinho / atualizar UI
        onConfirm?.(resp, payload);
        onFechar?.();
      } else {
        const msg = resp?.message ?? resp?.msg ?? "Erro ao finalizar venda.";
        error?.(msg);
      }
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.msg ?? "Erro ao conectar com o servidor.";
      error?.(msg);
    } finally {
      setLoading(false);
    }
  }

  // preenche dinheiro com valor_liquido ao abrir (opcional)
  // useEffect(() => { if (aberto) setDinheiro(valorLiquido); }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onFechar}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.branco }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            borderColor: colors.brancoFumaca,
            background: `linear-gradient(90deg, ${colors.pretoSuave}, ${colors.pretoAzulado})`,
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: colors.branco }}>
            Finalizar Venda
          </h2>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: colors.branco }}
            title="Fechar"
          >
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: colors.azulSuave }}>
              <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                Valor bruto
              </div>
              <div className="text-xl font-bold" style={{ color: colors.pretoSuave }}>
                {formatarPreco(valorBrutoNum)}
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: colors.brancoOff }}>
              <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                Desconto (R$)
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
              />
              <div className="text-sm mt-2" style={{ color: colors.cinza }}>
                Valor líquido
              </div>
              <div className="text-lg font-semibold" style={{ color: colors.azul }}>
                {formatarPreco(valorLiquido)}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: colors.azulSuave }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                  Dinheiro
                </div>
                <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                  Troco: {formatarPreco(troco)}
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dinheiro}
                onChange={(e) => setDinheiro(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
              />
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: colors.brancoOff }}>
              <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                PIX
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pix}
                onChange={(e) => setPix(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
              />
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: colors.azulSuave }}>
              <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                Crédito
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={credito}
                onChange={(e) => setCredito(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
              />
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: colors.brancoOff }}>
              <div className="text-sm" style={{ color: colors.cinzaClaro }}>
                Débito
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={debito}
                onChange={(e) => setDebito(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ backgroundColor: colors.brancoGelo }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: colors.cinza }}>
                Total pago
              </span>
              <span className="font-semibold" style={{ color: colors.pretoSuave }}>
                {formatarPreco(totalPago)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: colors.cinza }}>
                Falta
              </span>
              <span className="font-semibold" style={{ color: colors.azul }}>
                {formatarPreco(falta)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm" style={{ color: colors.cinza }}>
                Troco
              </span>
              <span className="font-semibold" style={{ color: colors.pretoSuave }}>
                {formatarPreco(troco)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-3"
          style={{ borderColor: colors.brancoFumaca, backgroundColor: colors.branco }}
        >
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: colors.brancoGelo, color: colors.pretoSuave }}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!podeConfirmar || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              backgroundColor: podeConfirmar ? colors.azul : colors.azulSuave,
              color: colors.branco,
            }}
          >
            <IconCheck />
            {loading ? "Enviando..." : "Confirmar venda"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Conteúdo principal do PDV */
function PdvContent() {
  const [carrinho, setCarrinho] = useState([]);
  const [inputCodigo, setInputCodigo] = useState("");
  const [buscaStatus, setBuscaStatus] = useState("idle"); // idle | loading | success | error
  const [ultimoProduto, setUltimoProduto] = useState(null);
  const [modalCalculadora, setModalCalculadora] = useState(false);
  const [modalEstoque, setModalEstoque] = useState(false);
  const [modalPrecos, setModalPrecos] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [buscaPreco, setBuscaPreco] = useState("");
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [produtosPreco, setProdutosPreco] = useState([]);
  const inputRef = useRef(null);
  const [modalFinalizar, setModalFinalizar] = useState(false);

  const { error, success } = useNotification();

  async function buscarProduto(termo) {
    const t = String(termo || inputCodigo).trim();
    if (!t) return;
    setBuscaStatus("loading");
    setUltimoProduto(null);
    try {
      const data = await post("/produtos/buscar", { termo: t });
      const raw = data?.produto ?? data?.data ?? data;
      const lista = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const prod = lista[0];
      const nome = prod?.name_produto ?? prod?.nome ?? prod?.name ?? "Produto";
      const preco = Number(prod?.preco ?? prod?.price ?? 0);
      if (nome && preco >= 0) {
        const item = {
          id: prod?.id ?? Date.now(),
          nome,
          preco,
          codigo: prod?.codigo ?? prod?.ref ?? prod?.ref2,
          quantidade: prod?.quantidade ?? prod?.estoque ?? prod?.stock,
        };
        setUltimoProduto(item);
        adicionarCarrinho(item);
        setBuscaStatus("success");
        setInputCodigo("");
      } else {
        setInputCodigo("");
        setBuscaStatus("error");
      }
    } catch (err) {
      setInputCodigo("");
      const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Produto não encontrado.";
      error(msg);
      setBuscaStatus("error");
    } finally {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function adicionarCarrinho(prod) {
    const nome = prod.nome ?? prod.name ?? "Produto";
    const preco = Number(prod.preco ?? prod.price ?? 0);
    setCarrinho((prev) => {
      const existe = prev.find((p) => p.id === prod.id || (p.codigo && p.codigo === prod.codigo));
      if (existe) {
        return prev.map((p) =>
          p.id === prod.id || p.codigo === prod.codigo ? { ...p, qtd: p.qtd + 1 } : p
        );
      }
      return [...prev, { ...prod, nome, preco, qtd: 1, codigo: prod.codigo }];
    });
  }

  function alterarQtd(id, delta) {
    setCarrinho((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qtd: Math.max(0, p.qtd + delta) } : p))
        .filter((p) => p.qtd > 0)
    );
  }

  function removerItem(id) {
    setCarrinho((prev) => prev.filter((p) => p.id !== id));
  }

  const total = carrinho.reduce((acc, p) => acc + p.preco * p.qtd, 0);

  // callback que será chamado pelo modal quando a venda for finalizada com sucesso
  function handleVendaSucesso(resp /* resposta do backend */, payload) {
    // limpa carrinho e atualiza UI
    setCarrinho([]);
    setUltimoProduto(null);
    setModalFinalizar(false);

    // mostra notificação (caso backend não tenha retornado status true)
    if (!resp?.status && !resp?.ok && !resp?.success) {
      const msg = resp?.message ?? resp?.msg ?? "Venda finalizada (resposta inesperada).";
      success?.(msg);
    }
    // se quiser processar resp (ex: id da venda) faça aqui
  }

  function calcInput(val) {
    if (val === "C") {
      setCalcDisplay("0");
      return;
    }
    if (val === "=") {
      try {
        // calculadora simples (atenção com eval em produção)
        const result = eval(calcDisplay.replace(",", "."));
        setCalcDisplay(String(Number(result.toFixed(2))).replace(".", ","));
      } catch {
        setCalcDisplay("Erro");
      }
      return;
    }
    setCalcDisplay((d) => {
      if (d === "0" && val !== ",") return val;
      if (d === "Erro") return val;
      return d + val;
    });
  }

  const teclasCalc = ["7", "8", "9", "+", "4", "5", "6", "-", "1", "2", "3", "*", "C", "0", ",", "="];

  async function abrirModalEstoque() {
    setModalEstoque(true);
    try {
      const data = await get("/produtos", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const lista = Array.isArray(data) ? data : data?.produtos ?? data?.data ?? [];
      setProdutosEstoque(lista);
    } catch (error) {
      setProdutosEstoque([]);
    }
  }

  async function abrirModalPrecos() {
    setModalPrecos(true);
    try {
      const data = await get("/produtos", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const lista = Array.isArray(data) ? data : data?.produtos ?? data?.data ?? [];
      setProdutosPreco(lista);
    } catch {
      setProdutosPreco([]);
    }
  }

  const filtradosPreco =
    buscaPreco === ""
      ? produtosPreco
      : produtosPreco.filter((p) => {
          const text = String(
            p.name_produto ?? p.nome ?? p.name ?? p.codigo ?? p.ref ?? p.ref2 ?? ""
          ).toLowerCase();
          return text.includes(buscaPreco.toLowerCase());
        });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.pretoAzulado }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: colors.pretoSuave }}>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white hover:opacity-80 font-medium">
            ← Voltar
          </Link>
          <h1 className="text-xl font-bold text-white">Mercearia — PDV</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={abrirModalEstoque}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: colors.azul, color: colors.branco }}
          >
            <IconBox size={18} />
            Produtos no Estoque
          </button>
          <button
            onClick={abrirModalPrecos}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: colors.azul, color: colors.branco }}
          >
            <IconDollar size={18} />
            Verificar Preços
          </button>
          <button
            onClick={() => setModalCalculadora(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: colors.azul, color: colors.branco }}
          >
            <IconCalculator size={18} />
            Calculadora
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        {/* Painel de busca por código/ref */}
        <section className="flex-1 rounded-xl p-6 flex flex-col" style={{ backgroundColor: colors.branco }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: colors.pretoSuave }}>
            Buscar produto
          </h2>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <IconSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                style={{ color: colors.cinzaClaro }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Código, ref, ref2, id ou nome do produto..."
                value={inputCodigo}
                onChange={(e) => {
                  setInputCodigo(e.target.value);
                  setBuscaStatus("idle");
                }}
                onKeyDown={(e) => e.key === "Enter" && buscarProduto()}
                autoFocus
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 text-lg focus:outline-none transition-colors"
                style={{
                  borderColor: buscaStatus === "error" ? "#ef4444" : colors.brancoSuave,
                  color: colors.pretoSuave,
                }}
              />
            </div>
            <button
              onClick={() => buscarProduto()}
              disabled={buscaStatus === "loading" || !inputCodigo.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: colors.azul, color: colors.branco }}
            >
              {buscaStatus === "loading" ? (
                <span className="animate-pulse">Buscando...</span>
              ) : (
                <>
                  <IconSearch size={20} />
                  Buscar
                </>
              )}
            </button>
          </div>

          {buscaStatus === "error" && (
            <p className="mt-2 text-sm" style={{ color: "#ef4444" }}>
              Produto não encontrado. Verifique o código ou ref.
            </p>
          )}
          {buscaStatus === "success" && ultimoProduto && (
            <div
              className="mt-4 p-4 rounded-xl flex items-center justify-between"
              style={{ backgroundColor: colors.azulSuave, borderLeft: `4px solid ${colors.azul}` }}
            >
              <div>
                <p className="font-semibold" style={{ color: colors.pretoSuave }}>
                  {ultimoProduto.nome}
                </p>
                <p className="text-sm mt-1" style={{ color: colors.azul }}>
                  {formatarPreco(ultimoProduto.preco)} — adicionado ao carrinho
                </p>
              </div>
            </div>
          )}

          <p className="mt-6 text-sm" style={{ color: colors.cinzaClaro }}>
            Busca por: <strong>codigo</strong>, <strong>ref</strong>, <strong>ref2</strong>, <strong>id</strong> ou{" "}
            <strong>name_produto</strong>. Pressione Enter ou clique em Buscar.
          </p>
        </section>

        {/* Carrinho */}
        <section
          className="w-full lg:w-[420px] rounded-xl flex flex-col overflow-hidden shrink-0"
          style={{ backgroundColor: colors.branco }}
        >
          <h2
            className="text-lg font-semibold px-4 py-3 border-b flex items-center gap-2"
            style={{ color: colors.pretoSuave, borderColor: colors.brancoFumaca }}
          >
            <IconBox size={20} style={{ color: colors.azul }} />
            Carrinho
          </h2>
          <div className="flex-1 overflow-auto p-4 min-h-[200px]">
            {carrinho.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: colors.cinzaClaro }}>
                <IconBox className="opacity-40 mb-2" size={48} />
                <p>Carrinho vazio</p>
                <p className="text-sm mt-1">Busque produtos pelo código para adicionar</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {carrinho.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: colors.azulSuave }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: colors.pretoSuave }}>
                        {p.nome}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: colors.azul }}>
                        {formatarPreco(p.preco)} × {p.qtd} = {formatarPreco(p.preco * p.qtd)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => alterarQtd(p.id, -1)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-colors hover:bg-white/80"
                        style={{ backgroundColor: colors.branco, border: `1px solid ${colors.azul}`, color: colors.azul }}
                      >
                        <IconMinus size={16} />
                      </button>
                      <span className="w-8 text-center font-semibold" style={{ color: colors.pretoSuave }}>
                        {p.qtd}
                      </span>
                      <button
                        onClick={() => alterarQtd(p.id, 1)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-colors hover:opacity-90"
                        style={{ backgroundColor: colors.azul, color: colors.branco }}
                      >
                        <IconPlus size={16} />
                      </button>
                      <button
                        onClick={() => removerItem(p.id)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title="Remover"
                      >
                        <IconTrash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div
            className="px-4 py-4 border-t space-y-3"
            style={{ borderColor: colors.brancoFumaca, backgroundColor: colors.brancoOff }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: colors.pretoSuave }}>
                Total:
              </span>
              <span className="text-xl font-bold" style={{ color: colors.azul }}>
                {formatarPreco(total)}
              </span>
            </div>
            <button
              onClick={() => setModalFinalizar(true)}
              disabled={carrinho.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: colors.azul, color: colors.branco }}
            >
              <IconCheck size={20} />
              Finalizar venda
            </button>
          </div>
        </section>
      </div>

      {/* Modal Calculadora */}
      <Modal aberto={modalCalculadora} onFechar={() => setModalCalculadora(false)} titulo="Calculadora">
        <div className="space-y-4">
          <div
            className="h-14 rounded-xl flex items-center justify-end px-4 text-2xl font-mono"
            style={{ backgroundColor: colors.brancoFumaca, color: colors.pretoSuave }}
          >
            {calcDisplay}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {teclasCalc.map((t) => (
              <button
                key={t}
                onClick={() => calcInput(t)}
                className="h-12 rounded-xl font-semibold transition-colors hover:opacity-90"
                style={{
                  backgroundColor: ["+", "-", "*", "="].includes(t)
                    ? colors.azul
                    : t === "C"
                    ? colors.cinzaClaro
                    : colors.azulSuave,
                  color: ["+", "-", "*", "=", "C"].includes(t) ? colors.branco : colors.pretoSuave,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal Estoque */}
      <Modal aberto={modalEstoque} onFechar={() => setModalEstoque(false)} titulo="Produtos no Estoque">
        <div className="space-y-2 max-h-80 overflow-auto">
          {produtosEstoque.length === 0 ? (
            <p className="text-center py-8" style={{ color: colors.cinzaClaro }}>
              Nenhum produto no estoque ou erro ao carregar.
            </p>
          ) : (
            produtosEstoque.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 rounded-xl"
                style={{ backgroundColor: colors.azulSuave }}
              >
                <span className="font-medium" style={{ color: colors.pretoSuave }}>
                  {p.name_produto ?? p.nome ?? p.name ?? "Produto"}
                </span>
                <span className="font-semibold" style={{ color: colors.azul }}>
                  {p.quantidade ?? p.estoque ?? p.stock ?? "—"} un.
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Modal Verificar Preços */}
      <Modal aberto={modalPrecos} onFechar={() => setModalPrecos(false)} titulo="Verificar Preços">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
              style={{ color: colors.cinzaClaro }}
            />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={buscaPreco}
              onChange={(e) => setBuscaPreco(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border-2"
              style={{ borderColor: colors.brancoFumaca, color: colors.pretoSuave }}
            />
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-auto">
          {produtosPreco.length === 0 ? (
            <p className="text-center py-8" style={{ color: colors.cinzaClaro }}>
              Nenhum produto ou erro ao carregar.
            </p>
          ) : filtradosPreco.length === 0 ? (
            <p className="text-center py-8" style={{ color: colors.cinzaClaro }}>
              Nenhum produto encontrado para &quot;{buscaPreco}&quot;
            </p>
          ) : (
            filtradosPreco.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 rounded-xl"
                style={{ backgroundColor: colors.azulSuave }}
              >
                <span className="font-medium" style={{ color: colors.pretoSuave }}>
                  {p.name_produto ?? p.nome ?? p.name ?? "Produto"}
                </span>
                <span className="font-bold" style={{ color: colors.azul }}>
                  {formatarPreco(p.preco ?? p.price)}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Modal Finalizar */}
      <FinalizarModal
        aberto={modalFinalizar}
        onFechar={() => setModalFinalizar(false)}
        valorBruto={total}
        itens={carrinho}
        onConfirm={handleVendaSucesso}
      />
    </div>
  );
}

export default function Pdv() {
  return (
    <ProtectedRoute areaId={AREAS.PDV}>
      <PdvContent />
    </ProtectedRoute>
  );
}
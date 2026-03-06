import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { get } from "../services/api";
import { useNotification } from "../contexts/NotificationContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { AREAS } from "../constants/areas";

/* ---------- helpers de formatação ---------- */
function formatarPreco(val) {
  // garante número e evita NaN
  const n = Number(val ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(n) ? 0 : n);
}

function formatarQuantidade(val) {
  return val != null ? val : "—";
}

function formatarData(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val; // se já for uma string amigável
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/* ---------- Modal como componente React ---------- */
function ModalDetalhesVenda({ venda, loading, onClose }) {
  if (!venda && !loading) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl" onClick={stop}>
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold mb-4">
            Detalhes da Venda #{venda?.numero_venda ?? "—"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-600">Carregando detalhes...</div>
        ) : (
          <>
            <p><strong>Data:</strong> {formatarData(venda?.criado_em ?? venda?.data ?? venda?.created_at)}</p>
            <p><strong>Total líquido:</strong> {formatarPreco(venda?.total_liquido ?? venda?.total ?? venda?.valor)}</p>

            <div className="mt-4">
              <p className="font-semibold">Itens:</p>

              {Array.isArray(venda?.itens) && venda.itens.length > 0 ? (
                <div className="mt-2 overflow-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600">
                        <th className="py-2 px-2">Produto</th>
                        <th className="py-2 px-2 text-right">Preço unit.</th>
                        <th className="py-2 px-2 text-right">Quantidade</th>
                        <th className="py-2 px-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {venda.itens.map((item, idx) => {
                        const nome = item.nome ?? item.name_produto ?? item.produto_nome ?? `Item ${idx + 1}`;
                        const valorUnit = Number(item.valor_unitario ?? item.preco_unitario ?? item.preco ?? item.valor ?? 0);
                        const qtd = Number(item.quantidade ?? item.qtd ?? item.qty ?? 1);
                        const subtotal = (isNaN(valorUnit) ? 0 : valorUnit) * (isNaN(qtd) ? 0 : qtd);
                        return (
                          <tr key={idx} className="border-t">
                            <td className="py-2 px-2 align-top">{nome}</td>
                            <td className="py-2 px-2 text-right align-top">{formatarPreco(valorUnit)}</td>
                            <td className="py-2 px-2 text-right align-top">{formatarQuantidade(qtd)}</td>
                            <td className="py-2 px-2 text-right align-top">{formatarPreco(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500 mt-2">Nenhum item detalhado disponível.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Componente principal ---------- */
function RelatorioVendasContent() {
  const { error } = useNotification();
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes"); // mes, semana, ano

  // estado para modal/detalhes
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function carregar() {
      setLoading(true);
      try {
        const data = await get(`/vendas/relatorio/${periodo}`);
        if (!mounted) return;
        setRelatorio(data);
      } catch (err) {
        const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao carregar relatório.";
        error(msg);
        if (!mounted) return;
        setRelatorio({
          data: [],
          message: msg,
          status: false,
          valor_investido: 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    carregar();
    return () => { mounted = false; };
  }, [periodo, error]);

  // usa relatorio.data quando disponível (conforme JSON que você enviou)
  const vendas = relatorio?.data ?? relatorio?.vendas ?? [];
  const totalVendasCount = Array.isArray(vendas) ? vendas.length : 0;

  // converte strings de valores para número e soma
  const somaTotalBruto = vendas.reduce((acc, v) => {
    const n = parseFloat(v.total_bruto ?? v.total ?? 0);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  const somaTotalDesconto = vendas.reduce((acc, v) => {
    const n = parseFloat(v.total_desconto ?? 0);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  const somaTotalLiquido = vendas.reduce((acc, v) => {
    const n = parseFloat(v.total_liquido ?? v.total ?? 0);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  // valor investido vem no topo do JSON (string)
  const valor_investido = Number(relatorio?.valor_investido ?? relatorio?.valorInvestido ?? 0);

  const valor_bruto_minus_desconto = somaTotalBruto - somaTotalDesconto;
  const valor_bruto = somaTotalBruto; // se preferir mostrar apenas bruto, usar esta
  const valor_liquido = somaTotalLiquido;
  const ticket_medio = totalVendasCount > 0 ? (valor_liquido / totalVendasCount) : 0;

  // Abre detalhes: tenta usar numero_venda para buscar detalhes se não tiver 'itens' no objeto
  async function abrirDetalhes(venda) {
    // se a venda já contém itens, só exibe
    if (Array.isArray(venda?.itens) && venda.itens.length > 0) {
      setVendaSelecionada(venda);
      return;
    }

    // tenta buscar detalhes por id/numero_venda
    const idOrNumero = venda?.id ?? venda?.sale_id ?? venda?.numero_venda;
    if (!idOrNumero) {
      // se não tiver id, abre com o objeto atual (mesmo que sem itens)
      setVendaSelecionada(venda);
      return;
    }

    setModalLoading(true);
    setVendaSelecionada(null);
    try {
      // 1) tenta endpoint padrão /vendas/:id
      let data;
      try {
        data = await get(`/vendas/${idOrNumero}`);
      } catch (err1) {
        // 2) fallback: /vendas/numero/:numero (algumas APIs usam esse formato)
        try {
          data = await get(`/vendas/numero/${idOrNumero}`);
        } catch (err2) {
          // rethrow o erro original para cair no catch externo
          throw err1;
        }
      }

      const detalhe = data?.data ?? data;
      setVendaSelecionada(detalhe);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.msg ?? "Erro ao carregar detalhes da venda.";
      error(msg);
      // fallback: abre com o objeto atual (sem itens)
      setVendaSelecionada(venda);
    } finally {
      setModalLoading(false);
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
          <h1 className="text-xl font-bold text-white">Relatório de Vendas</h1>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="px-4 py-2 rounded-lg border-2 bg-white text-slate-900 border-slate-200 focus:border-blue-600 outline-none"
        >
          <option value="semana">Última semana</option>
          <option value="mes">Último mês</option>
          <option value="ano">Último ano</option>
        </select>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando relatório...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8">
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
              >
                <p className="text-slate-400 text-sm mb-1">Total de vendas</p>
                <p className="text-2xl font-bold text-white">{totalVendasCount}</p>
              </div>
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
              >
                <p className="text-slate-400 text-sm mb-1">Valor investido</p>
                <p className="text-2xl font-bold text-red-400">{formatarPreco(valor_investido)}</p>
              </div>
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
              >
                <p className="text-slate-400 text-sm mb-1">Valor bruto/desconto</p>
                {/* mostra bruto - desconto, se quiser só o bruto use formatarPreco(valor_bruto) */}
                <p className="text-2xl font-bold text-orange-400">{formatarPreco(valor_bruto_minus_desconto)}</p>
              </div>
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
              >
                <p className="text-slate-400 text-sm mb-1">Valor líquido</p>
                <p className="text-2xl font-bold text-green-400">{formatarPreco(valor_liquido)}</p>
              </div>
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}
              >
                <p className="text-slate-400 text-sm mb-1">Ticket médio</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatarPreco(ticket_medio)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div
                className="px-6 py-4 border-b"
                style={{ backgroundColor: "#1A1A1A", borderColor: "#334155" }}
              >
                <h2 className="text-lg font-bold text-white">Histórico de vendas</h2>
              </div>
              {vendas.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  Nenhuma venda no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-4 px-4 font-semibold text-slate-800">Data</th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-800">ID</th>
                        <th className="text-left py-4 px-4 font-semibold text-slate-800">Itens</th>
                        <th className="text-right py-4 px-4 font-semibold text-slate-800">quantidade de produtos</th>
                        <th className="text-right py-4 px-4 font-semibold text-slate-800">Valor bruto</th>
                        <th className="text-right py-4 px-4 font-semibold text-slate-800">Total líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendas.map((v) => (
                        <tr key={v.numero_venda ?? Math.random()} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-700">
                            {formatarData(v.criado_em ?? v.data ?? v.created_at)}
                          </td>
                          <td className="py-3 px-4 text-orange-700 font-mono text-sm">
                            {v.numero_venda ?? "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <button
                              className="text-blue-500 hover:text-blue-700 bg-transparent border border-blue-500 rounded px-2 py-1 text-sm"
                              onClick={() => abrirDetalhes(v)}
                            >
                              Ver detalhes
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            {formatarQuantidade(v.total_itens ?? v.itens?.length ?? 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            {formatarPreco(v.total_bruto ?? v.total ?? v.valor)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">
                            {formatarPreco(v.total_liquido ?? v.total ?? v.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal renderizado condicionalmente */}
      { (vendaSelecionada || modalLoading) && (
        <ModalDetalhesVenda
          venda={vendaSelecionada}
          loading={modalLoading}
          onClose={() => {
            setVendaSelecionada(null);
            setModalLoading(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- export com ProtectedRoute ---------- */
export default function RelatorioVendas() {
  return (
    <ProtectedRoute areaId={AREAS.RELATORIOS}>
      <RelatorioVendasContent />
    </ProtectedRoute>
  );
}
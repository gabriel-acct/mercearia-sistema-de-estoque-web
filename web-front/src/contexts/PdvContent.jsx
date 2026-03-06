function FinalizarModal({ aberto, onFechar, onConfirm, valorBruto }) {
  const [desconto, setDesconto] = useState(0.0); // em reais
  const [dinheiro, setDinheiro] = useState(0.0);
  const [pix, setPix] = useState(0.0);
  const [credito, setCredito] = useState(0.0);
  const [debito, setDebito] = useState(0.0);

  const toNumber = (v) => {
    const n = typeof v === "string" ? v.replace(",", ".") : v;
    const parsed = Number(n);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const valorBrutoNum = toNumber(valorBruto);
  const descontoNum = Math.max(0, toNumber(desconto));
  const valorLiquido = Math.max(0, Number((valorBrutoNum - descontoNum).toFixed(2)));

  const totalPago = Number(
    (toNumber(dinheiro) + toNumber(pix) + toNumber(credito) + toNumber(debito)).toFixed(2)
  );

  const troco = Number(Math.max(0, (toNumber(dinheiro) - valorLiquido)).toFixed(2));
  const falta = Number(Math.max(0, valorLiquido - totalPago).toFixed(2));

  const podeConfirmar = totalPago >= valorLiquido && valorLiquido > 0;

  function handleConfirm() {
    if (!podeConfirmar) return;
    onConfirm({
      valor_bruto: Number(valorBrutoNum.toFixed(2)),
      desconto: Number(descontoNum.toFixed(2)),
      valor_liquido: Number(valorLiquido.toFixed(2)),
      total_dinheiro: Number(toNumber(dinheiro).toFixed(2)),
      total_pix: Number(toNumber(pix).toFixed(2)),
      total_credito: Number(toNumber(credito).toFixed(2)),
      total_debito: Number(toNumber(debito).toFixed(2)),
      total_troco: Number(troco.toFixed(2)),
    });
  }

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onFechar}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: "#FFFFFF" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#F5F5F5", background: "linear-gradient(90deg,#111827,#0b1220)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "#FFFFFF" }}>
            Finalizar Venda
          </h2>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "#FFFFFF" }}
            title="Fechar"
          >
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-auto flex-1 space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#EFF6FF" }}>
              <div className="text-sm text-gray-600">Valor bruto</div>
              <div className="text-xl font-bold text-[#1A1A1A]">{formatarPreco(valorBrutoNum)}</div>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#F8FAFF" }}>
              <div className="text-sm text-gray-600">Desconto (R$)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: "#EFF6FF", color: "#1A1A1A" }}
              />
              <div className="text-sm mt-2 text-gray-500">Valor líquido</div>
              <div className="text-lg font-semibold text-[#2563EB]">{formatarPreco(valorLiquido)}</div>
            </div>
          </div>

          {/* Pagamentos */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#EFF6FF" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">Dinheiro</div>
                <div className="text-sm text-gray-600">Troco: {formatarPreco(troco)}</div>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dinheiro}
                onChange={(e) => setDinheiro(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: "#EFF6FF", color: "#1A1A1A" }}
              />
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#F8FAFF" }}>
              <div className="text-sm text-gray-600">PIX</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pix}
                onChange={(e) => setPix(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: "#EFF6FF", color: "#1A1A1A" }}
              />
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#EFF6FF" }}>
              <div className="text-sm text-gray-600">Crédito</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={credito}
                onChange={(e) => setCredito(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: "#EFF6FF", color: "#1A1A1A" }}
              />
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#F8FAFF" }}>
              <div className="text-sm text-gray-600">Débito</div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={debito}
                onChange={(e) => setDebito(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border"
                style={{ borderColor: "#EFF6FF", color: "#1A1A1A" }}
              />
            </div>
          </div>

          {/* Totais */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: "#F3F4F6" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total pago</span>
              <span className="font-semibold text-[#1A1A1A]">{formatarPreco(totalPago)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Falta</span>
              <span className="font-semibold text-red-600">{formatarPreco(falta)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: "#F5F5F5", backgroundColor: "#FFFFFF" }}>
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: "#E5E7EB", color: "#1A1A1A" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!podeConfirmar}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
          >
            <IconCheck />
            Confirmar venda
          </button>
        </div>
      </div>
    </div>
  );
}
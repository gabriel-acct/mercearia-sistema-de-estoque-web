import { TABELA_CORES } from "../constants/colors";

export default function TabelaCores() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Tabela de Cores</h1>
        <p className="text-slate-400 mb-8">
          Paleta Mercearia — Branco, Preto e Azul
        </p>

        <div className="bg-white rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left py-4 px-6 font-semibold">Nome</th>
                <th className="text-left py-4 px-6 font-semibold">Variável</th>
                <th className="text-left py-4 px-6 font-semibold">Hex</th>
                <th className="text-left py-4 px-6 font-semibold">Amostra</th>
                <th className="text-left py-4 px-6 font-semibold">Uso</th>
              </tr>
            </thead>
            <tbody>
              {TABELA_CORES.map((cor, i) => (
                <tr
                  key={cor.variavel}
                  className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="py-3 px-6 text-slate-900 font-medium">{cor.nome}</td>
                  <td className="py-3 px-6 text-slate-600 font-mono text-sm">{cor.variavel}</td>
                  <td className="py-3 px-6 text-slate-600 font-mono text-sm">{cor.hex}</td>
                  <td className="py-3 px-6">
                    <div
                      className="w-12 h-8 rounded-lg border border-slate-200 shadow-sm"
                      style={{ backgroundColor: cor.hex }}
                    />
                  </td>
                  <td className="py-3 px-6 text-slate-600 text-sm">{cor.uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-6 bg-slate-800 rounded-xl text-slate-300 font-mono text-sm">
          <p className="text-white font-semibold mb-2">Importar em JS:</p>
          <code>import &#123; colors, TABELA_CORES &#125; from &apos;@/constants/colors&apos;;</code>
        </div>
      </div>
    </div>
  );
}

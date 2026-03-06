/**
 * Mapeamento de áreas do sistema por ID (nivel de acesso)
 * Os IDs devem corresponder à tabela `areas` do banco de dados
 *
 * PDV            = 1
 * Estoque        = 2
 * Funcionários   = 3
 * Relatórios     = 4
 * Configurações  = 5
 */
export const AREAS = {
  PDV: 1,
  ESTOQUE: 2,
  FUNCIONARIOS: 3,
  RELATORIOS: 4,
  CONFIGURACOES: 5,
};

/**
 * Configuração dos cards da Home e rotas
 * id = área_id (nivel de acesso na tabela areas)
 */
export const AREAS_CONFIG = [
  { id: AREAS.PDV, titulo: "PDV", descricao: "Ponto de venda", path: "/pdv" },
  { id: AREAS.ESTOQUE, titulo: "Área de Estoque", descricao: "Ver, adicionar, editar e apagar produtos", path: "/estoque" },
  { id: AREAS.FUNCIONARIOS, titulo: "Funcionários", descricao: "Adicionar e gerenciar funcionários", path: "/funcionarios" },
  { id: AREAS.RELATORIOS, titulo: "Relatório de Vendas", descricao: "Relatório profissional das vendas", path: "/relatorios" },
  { id: AREAS.CONFIGURACOES, titulo: "Configurações", descricao: "Criar cargo, atribuir cargo, permissões", path: "/configuracoes" },
];

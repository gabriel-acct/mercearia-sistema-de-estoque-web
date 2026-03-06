/**
 * Tabela de Cores - Mercearia Sistema de Estoque
 * Paleta: Branco, Preto e Azul
 */

export const colors = {
  // Tons de Branco
  branco: '#FFFFFF',
  brancoFumaca: '#F5F5F5',
  brancoGelo: '#FAFAFA',
  brancoOff: '#F8F9FA',

  // Tons de Preto
  preto: '#000000',
  pretoSuave: '#1A1A1A',
  pretoAzulado: '#0F172A',
  cinzaEscuro: '#1E293B',
  cinza: '#334155',
  cinzaClaro: '#64748B',

  // Tons de Azul
  azul: '#2563EB',
  azulEscuro: '#1D4ED8',
  azulClaro: '#3B82F6',
  azulBrilhante: '#60A5FA',
  azulSuave: '#EFF6FF',
  azulHover: '#1E40AF',
};

// Hex para uso em CSS/Tailwind
export const COLORS_HEX = {
  branco: colors.branco,
  preto: colors.preto,
  azul: colors.azul,
  azulEscuro: colors.azulEscuro,
  azulClaro: colors.azulClaro,
  azulSuave: colors.azulSuave,
  pretoSuave: colors.pretoSuave,
  pretoAzulado: colors.pretoAzulado,
};

// Tabela de referência (nome -> valor)
export const TABELA_CORES = [
  { nome: 'Branco', variavel: 'branco', hex: '#FFFFFF', uso: 'Fundo principal' },
  { nome: 'Branco Fumaça', variavel: 'brancoFumaca', hex: '#F5F5F5', uso: 'Fundo secundário' },
  { nome: 'Preto', variavel: 'preto', hex: '#000000', uso: 'Texto principal' },
  { nome: 'Preto Suave', variavel: 'pretoSuave', hex: '#1A1A1A', uso: 'Headers' },
  { nome: 'Preto Azulado', variavel: 'pretoAzulado', hex: '#0F172A', uso: 'Background dark' },
  { nome: 'Azul', variavel: 'azul', hex: '#2563EB', uso: 'Primária' },
  { nome: 'Azul Escuro', variavel: 'azulEscuro', hex: '#1D4ED8', uso: 'Botões hover' },
  { nome: 'Azul Claro', variavel: 'azulClaro', hex: '#3B82F6', uso: 'Links' },
  { nome: 'Azul Suave', variavel: 'azulSuave', hex: '#EFF6FF', uso: 'Cards, highlights' },
];

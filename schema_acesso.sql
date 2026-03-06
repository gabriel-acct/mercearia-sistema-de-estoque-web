-- =====================================================
-- SCHEMA: Controle de Acesso por Cargo e Área
-- Sistema Mercearia - Níveis de acesso configuráveis
-- =====================================================

-- 1. Tabela de ÁREAS (cada módulo do sistema tem um ID)
-- Você pode adicionar novas áreas aqui
CREATE TABLE IF NOT EXISTS areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    path VARCHAR(100) NULL COMMENT 'Rota do frontend, ex: /pdv, /estoque',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir áreas padrão (IDs fixos para referência)
INSERT INTO areas (id, nome, descricao, path) VALUES
(1, 'PDV', 'Ponto de venda', '/pdv'),
(2, 'Área de Estoque', 'Produtos - ver, adicionar, editar, apagar', '/estoque'),
(3, 'Funcionários', 'Gerenciar funcionários e cargos', '/funcionarios'),
(4, 'Relatório de Vendas', 'Relatórios profissionais de vendas', '/relatorios'),
(5, 'Configurações', 'Criar cargo, atribuir cargo, permissões', '/configuracoes')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), descricao = VALUES(descricao), path = VALUES(path);


-- 2. Tabela de CARGOS
CREATE TABLE IF NOT EXISTS cargos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir cargos padrão
INSERT INTO cargos (id, nome, descricao) VALUES
(1, 'admin', 'Acesso total ao sistema'),
(2, 'gerente', 'PDV, Estoque e Relatórios'),
(3, 'caixa', 'Apenas PDV'),
(4, 'estoque', 'PDV e Estoque')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), descricao = VALUES(descricao);


-- 3. Tabela de relação: quais áreas cada cargo pode acessar
-- Configure aqui: adicione/remova linhas para definir permissões
CREATE TABLE IF NOT EXISTS cargo_areas (
    cargo_id INT NOT NULL,
    area_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cargo_id, area_id),
    FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
);

-- Permissões admin (id 1): acessa tudo (áreas 1, 2, 3, 4, 5)
INSERT INTO cargo_areas (cargo_id, area_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5)
ON DUPLICATE KEY UPDATE cargo_id = cargo_id;

-- Permissões gerente (id 2): PDV, Estoque, Relatórios (1, 2, 4)
INSERT INTO cargo_areas (cargo_id, area_id) VALUES
(2, 1), (2, 2), (2, 4)
ON DUPLICATE KEY UPDATE cargo_id = cargo_id;

-- Permissões caixa (id 3): apenas PDV (1)
INSERT INTO cargo_areas (cargo_id, area_id) VALUES
(3, 1)
ON DUPLICATE KEY UPDATE cargo_id = cargo_id;

-- Permissões estoque (id 4): PDV e Estoque (1, 2)
INSERT INTO cargo_areas (cargo_id, area_id) VALUES
(4, 1), (4, 2)
ON DUPLICATE KEY UPDATE cargo_id = cargo_id;


-- 4. Atualizar tabela USERS para referenciar cargo
-- Execute apenas se a coluna cargo_id ainda não existir:
-- ALTER TABLE users ADD COLUMN cargo_id INT NULL;
-- ALTER TABLE users ADD CONSTRAINT fk_users_cargo FOREIGN KEY (cargo_id) REFERENCES cargos(id);

-- Vincular usuários existentes (ajuste conforme seus dados):
-- UPDATE users SET cargo_id = 3 WHERE cargo_id IS NULL;  -- default caixa


-- =====================================================
-- Consultas úteis
-- =====================================================

-- Ver quais áreas cada cargo pode acessar:
-- SELECT c.nome AS cargo, a.id AS area_id, a.nome AS area
-- FROM cargos c
-- JOIN cargo_areas ca ON c.id = ca.cargo_id
-- JOIN areas a ON a.id = ca.area_id
-- ORDER BY c.nome, a.id;

-- Ver áreas que um usuário pode acessar (via cargo):
-- SELECT u.usuario, u.cargo_id, a.id AS area_id, a.nome AS area
-- FROM users u
-- JOIN cargo_areas ca ON u.cargo_id = ca.cargo_id
-- JOIN areas a ON a.id = ca.area_id
-- WHERE u.id = 1;

import mysql.connector
import json
import secrets
import string
from functools import wraps, lru_cache
from typing import Optional, Iterable, List, Set
from datetime import datetime, timedelta
from mysql.connector import Error
from flask import Flask, request, make_response, g, jsonify
from decimal import Decimal, ROUND_HALF_UP
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'super-secret-key-with-at-least-32-characters!!'
jwt = JWTManager(app)

def get_db_connection():
    return mysql.connector.connect(
        host='localhost',
        database='estoque_mercearia',
        user='root',
        password=''
    )

DUAS_CASAS = Decimal("0.00")

def money(valor):
    return Decimal(str(valor)).quantize(DUAS_CASAS, rounding=ROUND_HALF_UP)

def gerar_codigo(tamanho = 8):
    caracteres = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(caracteres) for _ in range(tamanho))

def salvar_log(tipo, id_usuario, acao, detalhes, ip, user_agent, rota):
    print(tipo, id_usuario, acao, detalhes, ip, user_agent, rota)
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "INSERT INTO logs_all (type, id_usuario, action, details, ip, user_agent, rota) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        cursor.execute(sql, (tipo, id_usuario, acao, detalhes, ip, user_agent, rota))
        conn.commit()
        cursor.close()
        conn.close()
        print('Log salvo com sucesso')
    except Exception as e:
        print('Erro ao salvar log', e)
        return {
            'status': False,
            'message': str(e)
        }
    finally:
        print('Fechando conexão')
        cursor.close()
        conn.close()
    print('Conexão fechada')
    return True


# ---------- helpers ----------
def to_list(x):
    if x is None:
        return []
    if isinstance(x, (list, tuple, set)):
        return list(x)
    return [x]

def as_int_list(lst) -> List[int]:
    out = []
    for v in lst or []:
        try:
            out.append(int(v))
        except Exception:
            continue
    return out

# Cache simples: armazena resultados da query por cargo_id
# lru_cache usa tuplas/ints, por isso aceitamos cargo_id int.
@lru_cache(maxsize=256)
def _fetch_areas_ids_for_cargo_db_cached(cargo_id: int) -> tuple:
    """
    Retorna tupla de area_id (int) que o cargo tem acesso.
    Esse resultado fica em cache pelo processo (LRU).
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "SELECT area_id FROM cargo_areas WHERE cargo_id = %s"
        cursor.execute(sql, (int(cargo_id),))
        rows = cursor.fetchall()
        if not rows:
            return tuple()
        return tuple(int(r['area_id']) for r in rows if r.get('area_id') is not None)
    except Exception as e:
        # não propaga; logue localmente se quiser
        print("Erro _fetch_areas_ids_for_cargo_db_cached:", e)
        return tuple()
    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

def _clear_cached_areas_for_cargo(cargo_id: int):
    """Use se atualizar permissões no DB e quiser invalidar cache programaticamente."""
    try:
        _fetch_areas_ids_for_cargo_db_cached.cache_clear()
    except Exception:
        pass

# ---------- Decorator principal ----------
def verificar_permissao_v2(
    area_necessaria: Optional[Iterable[int]] = None,
    permitir_areas: Optional[Iterable[int]] = None,
    permitir_cargos: Optional[Iterable[int]] = None,
    admin_cargo_id: int = 1,
    admin_bypass: bool = True,
    injetar_usuario: bool = True
):
    """
    Decorator unificado.
      - area_necessaria / permitir_areas: ids de área a checar (se presente, exige interseção).
        permitir_areas tem precedência sobre area_necessaria.
      - permitir_cargos: se passado, permite apenas cargos listados (após conversão para int).
      - admin_bypass: se True e cargo == admin_cargo_id, permite imediatamente.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_id = None
            try:
                user_id = get_jwt_identity()
            except Exception:
                user_id = None

            if not user_id:
                # sem token / identidade
                salvar_log('auth', None, 'acesso', 'JWT sem identidade', request.remote_addr, request.user_agent.string, request.path)
                return jsonify({'status': False, 'message': 'Token inválido ou ausente'}), 401

            # infos_usuario já retorna dicionário (status False em erro)
            info = infos_usuario(int(user_id))
            if not info or not info.get('id'):
                salvar_log('auth', user_id, 'acesso', 'Erro ao obter informações do usuário', request.remote_addr, request.user_agent.string, request.path)
                # infos_usuario pode já retornar {'status': False, 'message': '...'}
                message = info.get('message') if isinstance(info, dict) and info.get('message') else 'Usuário não encontrado'
                return jsonify({'status': False, 'message': message}), 401

            cargo_id = info.get('cargo_id')
            try:
                cargo_id = int(cargo_id) if cargo_id is not None else None
            except Exception:
                # se cargo_id for inválido, tratamos como None (sem permissões)
                cargo_id = None

            # ADMIN BYPASS
            if admin_bypass and cargo_id == int(admin_cargo_id):
                # injetar e retornar
                if injetar_usuario:
                    g.info_usuario = info
                    g.cargo_id = cargo_id
                    # busca áreas do cargo (pode ser usadas depois)
                    areas_ids = list(_fetch_areas_ids_for_cargo_db_cached(cargo_id))
                    g.areas_ids = areas_ids
                    g.areas_ids_permissao = areas_ids
                    try:
                        g.user_id = int(user_id)
                    except Exception:
                        g.user_id = user_id
                return f(*args, **kwargs)

            # validação por cargo explicitamente permitidos (se fornecida)
            if permitir_cargos is not None:
                allowed_cargos = set(as_int_list(to_list(permitir_cargos)))
                if cargo_id not in allowed_cargos:
                    salvar_log('permissao', user_id, 'acesso', f'Cargo {cargo_id} não está na lista de cargos permitidos {allowed_cargos}', request.remote_addr, request.user_agent.string, request.path)
                    return jsonify({'status': False, 'message': 'Cargo não autorizado para esta ação', 'cargo_id': cargo_id}), 403

            # obtém áreas que o cargo tem (usando cache)
            areas_ids = list(_fetch_areas_ids_for_cargo_db_cached(cargo_id)) if cargo_id is not None else []
            areas_filtradas_ints: Set[int] = set(as_int_list(areas_ids))

            # normaliza parâmetro requerido: prioriza permitir_areas se passado
            required_raw = permitir_areas if permitir_areas is not None else area_necessaria
            required_ints = set(as_int_list(to_list(required_raw)))

            # checagem: se houver required, verificar interseção com areas filtradas
            if required_ints:
                if not areas_filtradas_ints.intersection(required_ints):
                    salvar_log('permissao', user_id, 'acesso',
                               f'Usuário sem permissão. cargo: {cargo_id} - areas do cargo: {areas_ids} - requeridas: {list(required_ints)}',
                               request.remote_addr, request.user_agent.string, request.path)
                    return jsonify({
                        'status': False,
                        'message': 'Usuário não tem permissão nesta(s) área(s)',
                        'areas_ids': list(areas_ids),
                        'cargo_id': cargo_id,
                        'cargo_nome': obter_nome_cargo(cargo_id)
                    }), 403

            # injeta infos no contexto
            if injetar_usuario:
                g.info_usuario = info
                g.cargo_id = cargo_id
                g.areas_ids = areas_ids
                g.areas_ids_permissao = areas_ids
                try:
                    g.user_id = int(user_id)
                except Exception:
                    g.user_id = user_id

            return f(*args, **kwargs)
        return wrapper
    return decorator

# ---------- Decorators de conveniência ----------
def verificar_por_area(areas, **kwargs):
    """Uso: @verificar_por_area([2,4])"""
    return verificar_permissao_v2(area_necessaria=areas, **kwargs)

def verificar_por_cargo(cargos, **kwargs):
    """Uso: @verificar_por_cargo([1,3])"""
    return verificar_permissao_v2(permitir_cargos=cargos, **kwargs)

def infos_usuario(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # users deve ter coluna cargo_id (FK para cargos)
    sql = "SELECT id, usuario AS nome, cpf, telefone, cargo_id, criado_em, atualizado_em FROM users WHERE id = %s"
    try:
        cursor.execute(sql, (int(user_id),))
    except Exception:
        sql = "SELECT id, usuario AS nome, cpf, telefone, criado_em, atualizado_em FROM users WHERE id = %s"
        cursor.execute(sql, (int(user_id),))
    user_info = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user_info:
        return {
            'status': False,
            'message': 'Usuário não encontrado'
        }
    return user_info

def obter_areas_por_cargo(cargo_id):
    """Retorna lista de area_id que o cargo pode acessar. Requer tabelas areas, cargos, cargo_areas."""
    if cargo_id is None:
        return []   # melhor retornar lista vazia do que conceder permissões

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "SELECT area_id FROM cargo_areas WHERE cargo_id = %s"
        cursor.execute(sql, (int(cargo_id),))
        rows = cursor.fetchall()
        areas_ids = [r['area_id'] for r in rows] if rows else []
        return areas_ids
    except Exception as e:
        print('Erro obter_areas_por_cargo:', e)
        return []
    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

def obter_nome_cargo(cargo_id):
    if cargo_id is None:
        return 'caixa'
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "SELECT nome FROM cargos WHERE id = %s"
        cursor.execute(sql, (int(cargo_id),))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        return row['nome'] if row else 'caixa'
    except Exception:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass
        return 'caixa'

def obter_id_cargo(cargo_nome):
    """Retorna o id do cargo pelo nome"""
    if not cargo_nome:
        return 1  # retorna int, não string

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        sql = "SELECT id FROM cargos WHERE nome = %s LIMIT 1"
        cursor.execute(sql, (cargo_nome,))
        row = cursor.fetchone()
        return row['id'] if row else 1
    finally:
        cursor.close()
        conn.close()

def verificar_permissao_area(areas_ids, cargo_id):
    """
    Retorna a interseção: quais area_id da lista pertencem ao cargo.
    Ex.: areas_ids = [1,2,3], cargo_id = 5 -> retorna [1,3] (somente as que existem)
    """
    if not areas_ids or cargo_id is None:
        return []

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # cria placeholders para cada área: %s,%s,%s
        placeholders = ','.join(['%s'] * len(areas_ids))
        sql = f"SELECT area_id FROM cargo_areas WHERE area_id IN ({placeholders}) AND cargo_id = %s"
        params = tuple(areas_ids) + (int(cargo_id),)
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return [r['area_id'] for r in rows] if rows else []
    except Exception as e:
        print('Erro verificar_permissao_area:', e)
        return []
    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return make_response("", 200)

@app.route('/')
def home():
    return{
        'status': True,
        'message': 'API ONLINE'
    }

@app.route('/users', methods=['GET', 'POST'])
def users():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    sql = "SELECT id, usuario AS nome FROM users"
    cursor.execute(sql)
    users = cursor.fetchall()
    cursor.close()
    conn.close()

    return{
        'status': True,
        'message': 'OK',
        'users': users

    }

@app.route('/auth', methods=['GET', 'POST'])
def auth_post():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    sql = "SELECT * FROM users WHERE usuario = %s"
    cursor.execute(sql, (username,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if user and user['password'] == password:
        access_token = create_access_token(identity=str(user['id']), expires_delta=timedelta(hours=8))
        return {
            'status': True,
            'message': 'Login successful',
            'access_token': access_token
        }
    return {
        'status': False,
        'message': 'Senha ou usuário incorretos'
    }

@jwt_required()
def auth_get(current_user_id):
    infos_usuario_info = infos_usuario(int(current_user_id))
    if not infos_usuario_info.get('status', True):
        return {
            'status': False,
            'message': infos_usuario_info.get('message', 'Erro ao obter informações do usuário')
        }
    current_user_infos = {
        'id': infos_usuario_info['id'],
        'nome': infos_usuario_info['nome'],
        'cargo': infos_usuario_info.get('cargo') or 'caixa'
    }
    return {
        'status': True,
        'message': f'Token valido',
        'user_id': current_user_id,
        'user_info': current_user_infos
    }

@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    infos = infos_usuario(int(current_user_id))
    if isinstance(infos, dict) and infos.get('status') is False:
        return {'status': False, 'message': infos.get('message', 'Erro')}, 401
    cargo_id = infos.get('cargo_id')
    current_user_infos = {
        'id': infos['id'],
        'nome': infos['nome'],
        'cargo_id': cargo_id,
        'cargo_nome': obter_nome_cargo(cargo_id),
        'areas_ids': obter_areas_por_cargo(cargo_id)
    }
    return {
        'status': True,
        'message': 'Token valido',
        'user_id': current_user_id,
        'user_info': current_user_infos
    }

@app.route('/produtos', methods=['GET'])
@jwt_required()
def listar_produtos():
    """Lista todos os produtos para modais de estoque e preços."""
    auth_get_result = auth_get(get_jwt_identity())
    if not auth_get_result.get('status', True):
        return {
            'status': False,
            'message': auth_get_result.get('message', 'Erro de autenticação')
        }, 401
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    sql = "SELECT id, name_produto, preco, quantidade, ref, ref2, codigo FROM produtos WHERE status = 1"
    cursor.execute(sql)
    produtos = cursor.fetchall()
    cursor.close()
    conn.close()
    return {'status': True, 'produtos': produtos}

@app.route('/produtos/buscar', methods=['POST'])
@jwt_required()
def buscar_produto():
    """Busca produto por ref, ref2, codigo, id ou name_produto. Recebe JSON: {"termo": "..."}."""
    auth_get_result = auth_get(get_jwt_identity())
    if not auth_get_result.get('status', True):
        return {
            'status': False,
            'message': auth_get_result.get('message', 'Erro de autenticação')
        }, 401
    data = request.get_json() or {}
    termo = str(data.get('termo', '')).strip()
    if not termo:
        return {'status': False, 'message': 'Termo de busca obrigatório'}, 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Busca por id (numérico), codigo, ref, ref2 ou name_produto
    sql = """
        SELECT id, name_produto, preco, quantidade, ref, ref2, codigo
        FROM produtos
        WHERE status = 1 AND (codigo = %s OR ref = %s OR ref2 = %s)
           OR CAST(id AS CHAR) = %s
           OR name_produto LIKE %s
        LIMIT 1
    """
    cursor.execute(sql, (termo, termo, termo, termo, f"%{termo}%"))
    produto = cursor.fetchone()
    cursor.close()
    conn.close()

    if produto:
        return {'status': True, 'produto': produto}
    return {'status': False, 'message': 'Produto não encontrado'}, 404
    
@app.route('/produtos/', methods=['POST'])
@jwt_required()
def produtos_create():
    auth_get_result = auth_get(get_jwt_identity())
    if not auth_get_result.get('status', True):
        return {
            'status': False,
            'message': auth_get_result.get('message', 'Erro de autenticação')
        }, 401
    info_usuario = infos_usuario(int(get_jwt_identity()))
    if not info_usuario.get('status', True):
        salvar_log('produtos', get_jwt_identity(), 'criar', 'Erro ao obter informações do usuário', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': info_usuario.get('message', 'Erro ao obter informações do usuário')
        }, 401
    cargo_id = info_usuario.get('cargo_id')
    areas_ids = obter_areas_por_cargo(cargo_id)
    if 2 not in areas_ids:
        salvar_log('produtos', get_jwt_identity(), 'criar', 'Erro ao obter permissão para criar produtos', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para criar produtos',
            'areas_ids': areas_ids
        }, 403
    area_id = areas_ids[0]
    areas_ids_permissao = verificar_permissao_area(areas_ids, cargo_id)
    if not areas_ids_permissao:
        salvar_log('produtos', get_jwt_identity(), 'criar', 'Erro ao obter permissão para criar produtos nesta área', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para criar produtos nesta área',
            'areas_ids': areas_ids_permissao,
            'cargo_id': cargo_id,
            'cargo_nome': obter_nome_cargo(cargo_id)
        }, 403
    try:
        data = request.get_json() or {}
        name_produto = data.get('name_produto')
        preco = data.get('preco')
        quantidade = data.get('quantidade')
        ref = data.get('ref')
        ref2 = data.get('ref2')
        codigo = data.get('codigo')
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "INSERT INTO produtos (name_produto, preco, quantidade, ref, ref2, codigo) VALUES (%s, %s, %s, %s, %s, %s)"
        cursor.execute(sql, (name_produto, preco, quantidade, ref, ref2, codigo))
        conn.commit()
        cursor.close()
        conn.close()
        salvar_log('produtos', get_jwt_identity(), 'criar', 'Produto criado com sucesso', request.remote_addr, request.user_agent.string, request.path)
        return {'status': True, 'message': 'Produto criado com sucesso'}, 201
    except Exception as e:
        salvar_log('produtos', get_jwt_identity(), 'criar', 'Erro ao criar produto', request.remote_addr, request.user_agent.string, request.path)
        return {'status': False, 'message': str(e)}, 500
    finally:
        cursor.close()
        conn.close()

@app.route('/produtos/<int:id>', methods=['DELETE'])
@jwt_required()
def produtos_delete(id):
    auth_get_result = auth_get(get_jwt_identity())
    if not auth_get_result.get('status', True):
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro de autenticação', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': auth_get_result.get('message', 'Erro de autenticação')
        }, 401
    info_usuario = infos_usuario(int(get_jwt_identity()))
    if not info_usuario.get('status', True):
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao obter informações do usuário', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': info_usuario.get('message', 'Erro ao obter informações do usuário')
        }, 401
    cargo_id = info_usuario.get('cargo_id')
    areas_ids = obter_areas_por_cargo(cargo_id)
    if 2 not in areas_ids:
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao obter permissão para deletar produtos', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para deletar produtos',
            'areas_ids': areas_ids
        }, 403
    area_id = areas_ids[0]
    areas_ids_permissao = verificar_permissao_area(areas_ids, cargo_id)
    if not areas_ids_permissao:
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao obter permissão para deletar produtos nesta área', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para deletar produtos nesta área',
            'areas_ids': areas_ids_permissao,
            'cargo_id': cargo_id,
            'cargo_nome': obter_nome_cargo(cargo_id)
        }, 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "UPDATE produtos SET status = 0, atualizado_em = NOW() WHERE id = %s"
        cursor.execute(sql, (id,))
        conn.commit()
        cursor.close()
        conn.close()
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Produto deletado com sucesso', request.remote_addr, request.user_agent.string, request.path)
        return {'status': True, 'message': 'Produto deletado com sucesso'}, 200
    except Exception as e:
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao deletar produto', request.remote_addr, request.user_agent.string, request.path)
        return {'status': False, 'message': str(e)}, 500
    finally:
        cursor.close()
        conn.close()

def gerar_codigo_venda():
    return gerar_codigo()

@app.route('/produtos/<int:id>', methods=["PUT"])
@jwt_required()
@verificar_por_cargo(cargos=[4], injetar_usuario=True)
def edit_produto(id):
    g.info_usuario  # disponível por injetar_usuario=True
    try:

        data = request.get_json() or []
        codigo = data.get('codigo') or None
        name_produto = data.get('name_produto') or None
        preco = data.get('preco') or None
        quantidade = data.get('quantidade') or None
        ref = data.get('ref') or None
        ref2 = data.get('ref2') or None

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "UPDATE produtos SET codigo = %s, name_produto = %s, preco = %s, quantidade = %s, ref = %s, ref2 = %s, atualizado_em = NOW() WHERE id = %s"
        cursor.execute(sql, (codigo, name_produto, preco, quantidade, ref, ref2, id))
        conn.commit()
        cursor.close()
        conn.close()
        salvar_log('produtos', g.user_id, 'editar', 'Produto editado com sucesso', request.remote_addr, request.user_agent.string, request.path)
        return {'status': True, 'message': 'Produto editado com sucesso'}, 200
    except Exception as e:
        salvar_log('produtos', g.user_id, 'editar', 'Erro ao editar produto', request.remote_addr, request.user_agent.string, request.path)
        return {'status': False, 'message': str(e)}, 500
    finally:
        cursor.close()
        conn.close()

@app.route('/vendas', methods=['POST'])
@jwt_required()
def vendas_create():
    auth_get_result = auth_get(get_jwt_identity())
    if not auth_get_result.get('status', True):
        salvar_log('vendas', get_jwt_identity(), 'criar', 'Erro de autenticação', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': auth_get_result.get('message', 'Erro de autenticação')
        }, 401

    info_usuario = infos_usuario(int(get_jwt_identity()))
    if not info_usuario.get('status', True):
        salvar_log('vendas', get_jwt_identity(), 'criar', 'Erro ao obter informações do usuário', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': info_usuario.get('message', 'Erro ao obter informações do usuário')
        }, 401
    cargo_id = info_usuario.get('cargo_id')
    areas_ids = obter_areas_por_cargo(cargo_id)
    if 1 not in areas_ids:
        salvar_log('vendas', get_jwt_identity(), 'criar', 'Erro ao obter permissão para criar vendas', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para criar vendas',
            'areas_ids': areas_ids
        }, 403
    area_id = areas_ids[0]
    areas_ids_permissao = verificar_permissao_area(areas_ids, cargo_id)
    if not areas_ids_permissao:
        salvar_log('vendas', get_jwt_identity(), 'criar', 'Erro ao obter permissão para criar vendas nesta área', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para criar vendas nesta área',
            'areas_ids': areas_ids_permissao,
            'cargo_id': cargo_id,
            'cargo_nome': obter_nome_cargo(cargo_id)
        }, 403

    try:
        try:

            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            data = request.get_json()
            pagamentos = data.get("pagamentos", {})
            numero_venda = gerar_codigo_venda()
            all_produtos = []
            valor_bruto = money(0.00)
            valor_liquido = money(0.00)
            total_dinheiro = money(pagamentos.get('total_dinheiro'))
            total_pix = money(pagamentos.get('total_pix'))
            total_credito = money(pagamentos.get('total_credito'))
            total_debito = money(pagamentos.get('total_debito'))
            total_troco = money(pagamentos.get('total_troco'))
            desconto = money(pagamentos.get('desconto'))

            obs = data.get('observacoes') or None
        except Exception as e:
            print(f"ERRO {str(e)}")
            return{
                'status': False,
                'message': 'erro na captura dos dados,',
                'erro': str(e)
            }
        for item in data.get('itens'):
            try:
                quantidade = money(item.get('qtd'))
                id_produto = str(item.get('id'))
                sql = "SELECT preco, custo FROM produtos WHERE id = %s"
                cursor.execute(sql, (id_produto,))
                produto = cursor.fetchone()

                if not produto:
                    return {'status': False, 'message': 'Produto não encontrado'}, 404

                preco = money(produto.get('preco') or 0.00)
                custo = money(produto.get('custo') or 0.00)

                if preco is None:
                    return {'status': False, 'message': 'Produto ,0sem preço cadastrado'}, 400

                subtotal = money(preco * quantidade)
                valor_bruto += money(subtotal)
                valor_custo = money(custo * quantidade)
                valor_liquido += money(subtotal - desconto - valor_custo)

                all_produtos.append({
                    "id_produto": id_produto,
                    "quantidade": quantidade
                })
                try:
                    sql = "INSERT INTO itens_vendas (id_venda, id_produto, quantidade, valor_unitario, desconto, subtotal) VALUES (%s, %s, %s, %s, %s, %s)"
                    cursor.execute(sql, (numero_venda, id_produto, quantidade, preco,  desconto, subtotal))
                    conn.commit()
                except Exception as e:
                    print(f"ERRO: {str(e)}")
                    return{
                        'status': False,
                        'message': "Não foi possivel registrar a venda porfavor tente novamente mais tarde",
                        'erro': str(e)
                    }
            except Exception as e:
                print(f"ERRO:\n{str(e)}")
                return{
                    'status': False,
                    'message': 'Erro codigo: K12',
                    'erro': str(e)
                }
            
        try:

            sql2 = "INSERT INTO vendas (id_vendedor, numero_venda, total_bruto, total_desconto, total_liquido, total_dinheiro, total_credito, total_debito, total_pix, total_troco, observacoes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(sql2, (get_jwt_identity(), numero_venda, valor_bruto, desconto, valor_liquido, total_dinheiro, total_credito, total_debito, total_pix, total_troco, obs))
            conn.commit()
            return{
                'status': True,
                'message': 'venda registrada com sucesso.'
            }
        except Exception as e:
            print(f"ERRO: {str(e)}")
            return{
                'status': False,
                'message': 'erro',
                'erro': str(e)
            }
    except Exception as e:
        return {'status': False, 'message': 'Erro não encontrado', 'erro': str(e)}, 500

@app.route('/funcionarios/', methods=['GET'])
@jwt_required()
def get_funcionarios():
    auth_get_result = auth_get(get_jwt_identity())
    if not auth_get_result.get('status', True):
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro de autenticação', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': auth_get_result.get('message', 'Erro de autenticação')
        }, 401
    info_usuario = infos_usuario(int(get_jwt_identity()))
    if not info_usuario.get('status', True):
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao obter informações do usuário', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': info_usuario.get('message', 'Erro ao obter informações do usuário')
        }, 401
    cargo_id = info_usuario.get('cargo_id')
    areas_ids = obter_areas_por_cargo(cargo_id)
    if 2 not in areas_ids:
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao obter permissão para deletar produtos', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para deletar produtos',
            'areas_ids': areas_ids
        }, 403
    area_id = areas_ids[0]
    areas_ids_permissao = verificar_permissao_area(areas_ids, cargo_id)
    if not areas_ids_permissao:
        salvar_log('produtos', get_jwt_identity(), 'deletar', 'Erro ao obter permissão para deletar produtos nesta área', request.remote_addr, request.user_agent.string, request.path)
        return {
            'status': False,
            'message': 'Usuário não tem permissão para deletar produtos nesta área',
            'areas_ids': areas_ids_permissao,
            'cargo_id': cargo_id,
            'cargo_nome': obter_nome_cargo(cargo_id)
        }, 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        sql = "SELECT u.id, u.usuario, u.cargo_id, c.nome AS cargo_nome FROM users u INNER JOIN cargos c ON u.cargo_id = c.id LIMIT 300"

        cursor.execute(sql)
        users = cursor.fetchall()
        return{
            'status': True,
            'funcionarios': users
        }
    finally:
        cursor.close()
        conn.close()

@app.route('/funcionarios/<int:id>', methods=['PUT'])
@jwt_required()
@verificar_por_cargo(cargos=[1,2,4], injetar_usuario=True)
def edit_funcionario(id):

    conn = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return {'status': False, 'message': 'JSON inválido'}, 400

        usuario = data.get('usuario')
        cargo_name = data.get('cargo')
        password = data.get('senha') or None

        if not usuario or not cargo_name:
            return {
                'status': False,
                'message': 'Usuário e cargo são obrigatórios'
            }, 400

        cargo_id = obter_id_cargo(cargo_nome=cargo_name)

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = "UPDATE users SET usuario = %s, cargo_id = %s WHERE id = %s"
        cursor.execute(sql, (usuario, cargo_id, id))

        if password:
            sqlpassword = "UPDATE users SET password = %s WHERE id = %s"
            cursor.execute(sqlpassword, (password, id))

        conn.commit()

        salvar_log(
            'funcionario',
            g.user_id,
            'edit',
            f'Usuário ID {id} atualizado com sucesso',
            request.remote_addr,
            request.user_agent.string,
            request.path
        )

        return {
            'status': True,
            'message': 'Funcionário atualizado'
        }

    except Exception as e:
        if conn:
            conn.rollback()

        return {
            'status': False,
            'message': "Erro na atualização do usuário",
            'erro': str(e)
        }, 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/vendas/relatorio/<periodo>', methods=['GET'])
@jwt_required()
@verificar_por_cargo(cargos=[1,2], injetar_usuario=True)
def relatorio_vendas(periodo='mes'):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = "SELECT SUM(custo) as total_custo FROM produtos"
        cursor.execute(sql)
        custos = cursor.fetchall()
        valor_investido = custos[0]['total_custo'] if custos and custos[0]['total_custo'] else money(0.00)

        agora = datetime.now()

        if periodo == 'mes':
            inicio = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            if agora.month == 12:
                fim = inicio.replace(year=agora.year + 1, month=1)
            else:
                fim = inicio.replace(month=agora.month + 1)

        elif periodo == 'semana':
            inicio = (agora - timedelta(days=agora.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            fim = inicio + timedelta(days=7)

        elif periodo == 'dia':
            inicio = agora.replace(hour=0, minute=0, second=0, microsecond=0)
            fim = inicio + timedelta(days=1)

        elif periodo == 'ano':
            inicio = agora.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            fim = inicio.replace(year=agora.year + 1)

        sql = """
            SELECT 
                v.numero_venda,
                v.criado_em,
                v.total_bruto,
                v.total_desconto,
                v.total_liquido,
                COUNT(iv.id) AS total_itens
            FROM vendas v
            JOIN itens_vendas iv ON iv.id_venda = v.numero_venda
            WHERE v.criado_em >= %s
            AND v.criado_em < %s
            GROUP BY 
                v.numero_venda,
                v.criado_em,
                v.total_bruto,
                v.total_desconto,
                v.total_liquido
            ORDER BY v.criado_em DESC
        """

        cursor.execute(sql, (inicio, fim))
        resultados = cursor.fetchall()
        for venda in resultados:
            venda['criado_em'] = venda['criado_em'].strftime('%Y-%m-%d %H:%M:%S')
            
        cursor.close()
        conn.close()
        return {
            'status': True,
            'valor_investido': valor_investido,
            'message': f'Relatório de vendas para o período: {periodo}',
            'data': resultados
        }
    except Exception as e:
        print(f"ERROOOO: {str(e)}")
        return {
            'status': False,
            'message': 'Erro ao gerar relatório de vendas',
            'erro': str(e)
        }, 500
@app.route('/vendas/<string:numero_venda>', methods=['GET'])
@jwt_required()
@verificar_por_cargo(cargos=[1,2], injetar_usuario=True)
def vendas(numero_venda):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT 
                v.numero_venda,
                v.criado_em,
                v.total_bruto,
                v.total_desconto,
                v.total_liquido,
                v.total_dinheiro,
                v.total_credito,
                v.total_debito,
                v.total_pix,
                v.total_troco,
                v.observacoes,
                u.usuario AS vendedor
            FROM vendas v
            JOIN users u ON u.id = v.id_vendedor
            WHERE v.numero_venda = %s
        """

        cursor.execute(sql, (numero_venda,))
        venda = cursor.fetchone()

        if not venda:
            return {
                'status': False,
                'message': 'Venda não encontrada'
            }, 404

        venda['criado_em'] = venda['criado_em'].strftime('%Y-%m-%d %H:%M:%S')

        sql_itens = """
            SELECT 
                iv.id_produto,
                p.name_produto,
                iv.quantidade,
                iv.valor_unitario,
                iv.desconto,
                iv.subtotal
            FROM itens_vendas iv
            JOIN produtos p ON p.id = iv.id_produto
            WHERE iv.id_venda = %s
        """

        cursor.execute(sql_itens, (numero_venda,))
        itens = cursor.fetchall()

        venda['itens'] = itens

        cursor.close()
        conn.close()

        return {
            'status': True,
            'message': f'Detalhes da venda {numero_venda}',
            'data': venda
        }
    except Exception as e:
        print(f"ERROOOO: {str(e)}")
        return {
            'status': False,
            'message': 'Erro ao obter detalhes da venda',
            'erro': str(e)
        }, 500
    
if __name__ == '__main__':
    app.run(debug=True)
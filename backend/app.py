from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/pam_db')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'sua-chave-secreta-aqui')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

db = SQLAlchemy(app)
jwt = JWTManager(app)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(255), nullable=False)
    perfil = db.Column(db.String(20), nullable=False)
    ativo = db.Column(db.Boolean, default=True)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.senha = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.senha, password)
    
    def to_dict(self):
        return {'id': self.id, 'nome': self.nome, 'email': self.email, 'perfil': self.perfil, 'ativo': self.ativo, 'data_criacao': self.data_criacao.isoformat()}

class Equipamento(db.Model):
    __tablename__ = 'equipamentos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    localizacao = db.Column(db.String(100))
    data_aquisicao = db.Column(db.Date)
    quantidade_estoque = db.Column(db.Integer, default=1)
    requer_calibracao = db.Column(db.Boolean, default=False)
    frequencia_preventiva = db.Column(db.String(50))
    proxima_manutencao = db.Column(db.Date)
    ativo = db.Column(db.Boolean, default=True)
    criado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    manutencoes = db.relationship('Manutencao', backref='equipamento', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {'id': self.id, 'nome': self.nome, 'tipo': self.tipo, 'localizacao': self.localizacao, 'data_aquisicao': self.data_aquisicao.isoformat() if self.data_aquisicao else None, 'quantidade_estoque': self.quantidade_estoque, 'requer_calibracao': self.requer_calibracao, 'frequencia_preventiva': self.frequencia_preventiva, 'proxima_manutencao': self.proxima_manutencao.isoformat() if self.proxima_manutencao else None, 'ativo': self.ativo, 'data_criacao': self.data_criacao.isoformat()}

class Manutencao(db.Model):
    __tablename__ = 'manutencoes'
    id = db.Column(db.Integer, primary_key=True)
    equipamento_id = db.Column(db.Integer, db.ForeignKey('equipamentos.id'), nullable=False)
    data_manutencao = db.Column(db.Date, nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    tecnico = db.Column(db.String(100))
    empresa = db.Column(db.String(100))
    custo = db.Column(db.Float)
    pecas_substituidas = db.Column(db.Text)
    proxima_data_prevista = db.Column(db.Date)
    observacoes = db.Column(db.Text)
    registrado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {'id': self.id, 'equipamento_id': self.equipamento_id, 'data_manutencao': self.data_manutencao.isoformat(), 'tipo': self.tipo, 'tecnico': self.tecnico, 'empresa': self.empresa, 'custo': self.custo, 'pecas_substituidas': self.pecas_substituidas, 'proxima_data_prevista': self.proxima_data_prevista.isoformat() if self.proxima_data_prevista else None, 'observacoes': self.observacoes, 'registrado_por': self.registrado_por, 'data_criacao': self.data_criacao.isoformat()}

class Alerta(db.Model):
    __tablename__ = 'alertas'
    id = db.Column(db.Integer, primary_key=True)
    equipamento_id = db.Column(db.Integer, db.ForeignKey('equipamentos.id'), nullable=False)
    tipo_alerta = db.Column(db.String(50), nullable=False)
    descricao = db.Column(db.Text)
    data_alerta = db.Column(db.DateTime, default=datetime.utcnow)
    resolvido = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {'id': self.id, 'equipamento_id': self.equipamento_id, 'tipo_alerta': self.tipo_alerta, 'descricao': self.descricao, 'data_alerta': self.data_alerta.isoformat(), 'resolvido': self.resolvido}

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    senha = data.get('senha')
    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.check_password(senha):
        return jsonify({'erro': 'Email ou senha inválidos'}), 401
    if not usuario.ativo:
        return jsonify({'erro': 'Usuário inativo'}), 401
    access_token = create_access_token(identity=usuario.id)
    return jsonify({'token': access_token, 'usuario': usuario.to_dict()}), 200

@app.route('/api/equipamentos', methods=['GET'])
@jwt_required()
def listar_equipamentos():
    equipamentos = Equipamento.query.filter_by(ativo=True).all()
    return jsonify([eq.to_dict() for eq in equipamentos]), 200

@app.route('/api/equipamentos', methods=['POST'])
@jwt_required()
def criar_equipamento():
    usuario_id = get_jwt_identity()
    data = request.get_json()
    equipamento = Equipamento(nome=data.get('nome'), tipo=data.get('tipo'), localizacao=data.get('localizacao'), quantidade_estoque=data.get('quantidade_estoque', 1), requer_calibracao=data.get('requer_calibracao', False), frequencia_preventiva=data.get('frequencia_preventiva'), criado_por=usuario_id)
    db.session.add(equipamento)
    db.session.commit()
    return jsonify(equipamento.to_dict()), 201

@app.route('/api/manutencoes', methods=['GET'])
@jwt_required()
def listar_manutencoes():
    manutencoes = Manutencao.query.all()
    return jsonify([m.to_dict() for m in manutencoes]), 200

@app.route('/api/manutencoes', methods=['POST'])
@jwt_required()
def criar_manutencao():
    usuario_id = get_jwt_identity()
    data = request.get_json()
    manutencao = Manutencao(equipamento_id=data.get('equipamento_id'), data_manutencao=datetime.strptime(data.get('data_manutencao'), '%Y-%m-%d').date(), tipo=data.get('tipo'), tecnico=data.get('tecnico'), empresa=data.get('empresa'), custo=data.get('custo'), pecas_substituidas=data.get('pecas_substituidas'), proxima_data_prevista=datetime.strptime(data.get('proxima_data_prevista'), '%Y-%m-%d').date() if data.get('proxima_data_prevista') else None, observacoes=data.get('observacoes'), registrado_por=usuario_id)
    db.session.add(manutencao)
    equipamento = Equipamento.query.get(data.get('equipamento_id'))
    equipamento.proxima_manutencao = manutencao.proxima_data_prevista
    db.session.commit()
    return jsonify(manutencao.to_dict()), 201

@app.route('/api/alertas', methods=['GET'])
@jwt_required()
def listar_alertas():
    alertas = Alerta.query.filter_by(resolvido=False).all()
    return jsonify([a.to_dict() for a in alertas]), 200

@app.route('/api/alertas/gerar', methods=['POST'])
@jwt_required()
def gerar_alertas():
    Alerta.query.delete()
    db.session.commit()
    hoje = datetime.now().date()
    equipamentos = Equipamento.query.filter_by(ativo=True).all()
    for eq in equipamentos:
        if eq.proxima_manutencao and eq.proxima_manutencao < hoje:
            dias_vencidos = (hoje - eq.proxima_manutencao).days
            alerta = Alerta(equipamento_id=eq.id, tipo_alerta='manutencao_vencida', descricao=f'Vencida há {dias_vencidos} dias')
            db.session.add(alerta)
        elif eq.proxima_manutencao and (eq.proxima_manutencao - hoje).days <= 7:
            dias_ate = (eq.proxima_manutencao - hoje).days
            alerta = Alerta(equipamento_id=eq.id, tipo_alerta='proxima_manutencao', descricao=f'Vence em {dias_ate} dias')
            db.session.add(alerta)
        consumiveisRecompra = ['Máscara Laríngea', 'Bougie', 'Acesso Venoso Central', 'Dreno de Tórax']
        if eq.quantidade_estoque == 1 and eq.nome in consumiveisRecompra:
            alerta = Alerta(equipamento_id=eq.id, tipo_alerta='estoque_baixo', descricao='Quantidade em estoque = 1. Recomprar!')
            db.session.add(alerta)
    db.session.commit()
    alertas = Alerta.query.all()
    return jsonify([a.to_dict() for a in alertas]), 200

@app.route('/api/init-db', methods=['POST'])
def init_db():
    db.create_all()
    if not Usuario.query.filter_by(email='coordenador@pam.com').first():
        coordenador = Usuario(nome='Coordenador PAM', email='coordenador@pam.com', perfil='coordenador')
        coordenador.set_password('senha123')
        db.session.add(coordenador)
    if not Usuario.query.filter_by(email='gerente@pam.com').first():
        gerente = Usuario(nome='Gerente PAM', email='gerente@pam.com', perfil='gerente')
        gerente.set_password('senha123')
        db.session.add(gerente)
    db.session.commit()
    return jsonify({'mensagem': 'Banco de dados inicializado'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

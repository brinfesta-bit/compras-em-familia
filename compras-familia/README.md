# Compras em Família 🛒

App colaborativo de lista de compras em tempo real com Firebase.

## Tecnologias

- HTML5 / CSS3 / JavaScript (ES Modules)
- Firebase Auth (email/senha)
- Firebase Firestore (tempo real)

## Como usar

### 1. Configurar Firebase

As regras do Firestore estão em `firestore.rules`. Acesse o console do Firebase:
https://console.firebase.google.com/project/compras-em-familia-1c550/firestore/rules

Cole o conteúdo de `firestore.rules` e publique.

### 2. Ativar Authentication

No console Firebase → Authentication → Sign-in method → Email/Senha → Ativar

### 3. Abrir o app

Como o app usa ES Modules, precisa de um servidor HTTP local:

```bash
# Com Node.js (instale uma vez)
npx serve .

# Ou com Python
python -m http.server 8080
```

Acesse: http://localhost:3000 (ou a porta mostrada)

### 4. Criar conta

Na tela de login, clique em **"Criar conta de administrador"** para criar a primeira conta.
Compartilhe o email e senha com a família para acesso colaborativo em tempo real.

## Estrutura

```
compras-familia/
├── index.html        # Login
├── app.html          # Lista de compras principal
├── historico.html    # Histórico de feiras salvas
├── css/
│   ├── style.css     # Design system global
│   ├── login.css     # Estilos do login
│   ├── app.css       # Estilos do app
│   └── historico.css # Estilos do histórico
└── js/
    ├── firebase-config.js  # Configuração Firebase
    ├── data.js             # Dados dos produtos
    └── app.js              # Lógica principal
```

## Funcionalidades

- ✅ Login com email/senha
- 🔄 Sincronização em tempo real (todos veem as mudanças)
- 🛒 Lista com 200+ itens em 18 categorias
- ⠿ Drag & drop (arrastar entre categorias)
- ✅ Marcar como comprado (fica verde + vai para o final)
- 💰 Preço inline editável por item
- 📊 Total em tempo real no rodapé
- 💾 Salvar até 24 feiras
- 📋 Histórico com comparação item a item
- 🔍 Busca por nome
- 📱 Responsivo para celular

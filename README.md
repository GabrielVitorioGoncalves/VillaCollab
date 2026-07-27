<div align="center">

# 🛒 Villa Collab Marketplace

### Plataforma Multi-Tenant para Comércio Eletrônico

Uma plataforma moderna desenvolvida para conectar pequenos empreendedores a clientes em um único ambiente digital, utilizando arquitetura **Multi-Tenant**, foco em escalabilidade, segurança e experiência do usuário.

<br>

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange?style=for-the-badge)

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

---

# 📖 Sobre o Projeto

O **Villa Collab Marketplace** é um marketplace colaborativo criado para facilitar a entrada de pequenos empreendedores no comércio eletrônico.

Ao invés de cada comerciante precisar manter sua própria loja virtual, diversos lojistas compartilham uma única plataforma, mantendo seus dados totalmente isolados através de uma arquitetura **Multi-Tenant**.

O projeto foi concebido utilizando boas práticas de Engenharia de Software, Arquitetura de Sistemas, Segurança da Informação e Desenvolvimento Web.

---

# ✨ Funcionalidades

## 👤 Cliente

- Cadastro e Login
- Pesquisa de produtos
- Carrinho de compras
- Histórico de pedidos
- Gerenciamento de perfil

---

## 🏪 Lojista

- Cadastro da loja
- Cadastro de produtos
- Controle de estoque
- Gerenciamento de pedidos
- Dashboard de vendas

---

## 🔐 Administrador

- Gerenciamento de usuários
- Gerenciamento de lojas
- Controle de permissões
- Auditoria
- Monitoramento da plataforma

---

# 🎨 Protótipo

O design da aplicação foi desenvolvido no **Figma**, permitindo validar toda a experiência do usuário antes da implementação.

### 🔗 Acesse o protótipo

https://www.figma.com/design/5ubGBdbOpjNCYsWnDTHvlf/Collab?node-id=0-1

---

# 🏗 Arquitetura

```text
                 Usuário
                    │
                    ▼
          React Frontend
                    │
        HTTPS / REST API
                    │
                    ▼
     Node.js + TypeScript Backend
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
    PostgreSQL         Supabase Storage
          │
          ▼
 Multi-Tenant Database
```

---

# 💻 Tecnologias

### Front-end

- React
- JavaScript
- HTML5
- CSS3

### Back-end

- Node.js
- TypeScript
- Express.js

### Banco de Dados

- PostgreSQL
- Supabase

### DevOps

- Docker
- GitHub Actions
- Git

### Ferramentas

- Visual Studio Code
- Postman
- Jira
- Figma

---

# 🔒 Segurança

A segurança foi considerada desde o planejamento da aplicação.

### Autenticação

- JWT Authentication

### Autorização

- RBAC (Role Based Access Control)

### Proteção

- HTTPS
- Validação de Entradas
- Proteção contra SQL Injection
- Sanitização de Dados
- Backup
- Logs de Auditoria

### Multi-Tenant

- Isolamento de dados por `tenant_id`

### Conformidade

- LGPD
- OWASP Top 10
- ISO/IEC 27001

---

# 📂 Estrutura do Projeto

```bash
villa-collab/

├── frontend/
├── backend/
├── database/
├── docs/
├── docker/
├── .github/
└── README.md
```

---

# 🚀 Como executar

```bash
# Clone o repositório

git clone https://github.com/SEU-USUARIO/villa-collab.git

# Entre na pasta

cd villa-collab

# Instale as dependências

npm install

# Execute a aplicação

npm run dev
```

---

# 📅 Roadmap

- [x] Levantamento de requisitos
- [x] Modelagem da arquitetura
- [x] Prototipação no Figma
- [ ] Modelagem do banco de dados
- [ ] Sistema de autenticação
- [ ] Cadastro de usuários
- [ ] Cadastro de lojas
- [ ] Cadastro de produtos
- [ ] Dashboard Administrativo
- [ ] Dashboard do Lojista
- [ ] Upload de imagens
- [ ] Carrinho de compras
- [ ] Checkout
- [ ] Gateway de pagamento
- [ ] Deploy

---

# 🎯 Objetivos

- Democratizar o comércio eletrônico.
- Facilitar a digitalização de pequenos empreendedores.
- Desenvolver uma plataforma escalável.
- Aplicar boas práticas de Engenharia de Software.
- Construir um sistema seguro e preparado para crescimento.

---

# 📚 Documentação

- Arquitetura C4
- Levantamento de Requisitos
- Protótipos da Interface
- Modelagem do Banco de Dados
- Relatórios Técnicos

---

# 👨‍💻 Equipe

| Nome | GitHub |
|-------|--------|
| Gabriel Vitório Gonçalves |  |
| Lucas Leal de Oliveira |  |
| Yuri David Arins Cidral | |

---

# 📄 Licença

Este projeto está licenciado sob a licença **MIT**.

---

<div align="center">

### ⭐ Gostou do projeto?

Se este projeto foi útil para você, considere deixar uma estrela no repositório.

Desenvolvido por **Gabriel Vitório Gonçalves**, **Lucas Leal de Oliveira** e **Yuri David Arins Cidral**.

</div>
<div align="center">

# 🛒 Villa Collab Marketplace

### Plataforma Multi-Tenant para Comércio Eletrônico

Uma plataforma moderna de marketplace desenvolvida para conectar pequenos empreendedores a clientes em um único ambiente digital, utilizando arquitetura **Multi-Tenant**, boas práticas de Engenharia de Software e foco em segurança, escalabilidade e experiência do usuário.

<p>

![Status](https://img.shields.io/badge/status-Em%20Desenvolvimento-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react\&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge\&logo=node.js\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge\&logo=supabase\&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)

</p>

</div>

---

# 📖 Sobre

O **Villa Collab Marketplace** é uma plataforma de e-commerce colaborativo criada para permitir que diversos lojistas comercializem seus produtos em um único ambiente digital.

O projeto utiliza uma arquitetura **Multi-Tenant**, permitindo que cada loja possua seus próprios dados, produtos e pedidos, compartilhando a mesma infraestrutura de forma segura e escalável.

Além de facilitar a entrada de pequenos empreendedores no comércio eletrônico, o sistema foi projetado seguindo princípios modernos de **Arquitetura de Software**, **Segurança da Informação** e **Desenvolvimento Web**.

---

# ✨ Funcionalidades

## 👤 Clientes

* Cadastro e Login
* Navegação entre lojas
* Pesquisa de produtos
* Carrinho de compras
* Finalização de pedidos
* Histórico de compras

---

## 🏪 Lojistas

* Cadastro de lojas
* Cadastro de produtos
* Gerenciamento de estoque
* Gerenciamento de pedidos
* Dashboard de vendas

---

## 🔐 Administração

* Gerenciamento de usuários
* Gerenciamento de lojistas
* Controle de permissões
* Auditoria do sistema
* Monitoramento da plataforma

---

# 🎨 Protótipo

Toda a interface da aplicação foi planejada e prototipada no **Figma** antes da implementação.

<div align="center">

[![Figma](https://img.shields.io/badge/Abrir%20Protótipo%20no%20Figma-F24E1E?style=for-the-badge\&logo=figma\&logoColor=white)](https://www.figma.com/design/5ubGBdbOpjNCYsWnDTHvlf/Collab?node-id=0-1)

</div>

---

# 🏗 Arquitetura

O projeto segue uma arquitetura **Marketplace Multi-Tenant**, onde diversos lojistas compartilham a mesma aplicação mantendo seus dados completamente isolados.

```text
                   Internet
                       │
                       ▼
              React Frontend
                       │
          REST API (Node.js)
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   PostgreSQL                 Supabase Storage
        │
        ▼
 Multi-Tenant Database
```

---

# 💻 Tecnologias

## Front-end

* React
* JavaScript
* HTML5
* CSS3

## Back-end

* Node.js
* TypeScript
* Express.js

## Banco de Dados

* PostgreSQL
* Supabase

## DevOps

* Docker
* GitHub
* GitHub Actions

## Ferramentas

* Visual Studio Code
* Postman
* Jira
* Figma

---

# 🔒 Segurança

O sistema foi concebido considerando segurança desde as fases iniciais do projeto.

### Autenticação

* JWT
* Controle de Sessão

### Autorização

* RBAC (Role Based Access Control)

### Proteção

* HTTPS
* Validação de Entradas
* Proteção contra SQL Injection
* Sanitização de Dados

### Multi-Tenant

* Isolamento de dados através de **tenant_id**

### Auditoria

* Registro de Logs
* Backup
* Monitoramento de Vulnerabilidades

O projeto segue recomendações de:

* LGPD
* OWASP Top 10
* ISO/IEC 27001

---

# 📂 Estrutura

```bash
Villa-Collab/

├── frontend/
│
├── backend/
│
├── database/
│
├── docs/
│
├── docker/
│
├── .github/
│
└── README.md
```

---

# 🚀 Como executar

```bash
# Clone o projeto

git clone https://github.com/SEU-USUARIO/villa-collab.git

# Entre na pasta

cd villa-collab

# Instale as dependências

npm install

# Execute

npm run dev
```

---

# 📅 Roadmap

* [x] Levantamento de requisitos
* [x] Prototipação no Figma
* [x] Modelagem da arquitetura
* [x] Modelagem do banco de dados
* [ ] Sistema de autenticação
* [ ] Cadastro de usuários
* [ ] Cadastro de lojas
* [ ] Cadastro de produtos
* [ ] Upload de imagens
* [ ] Dashboard Administrativo
* [ ] Dashboard do Lojista
* [ ] Carrinho de Compras
* [ ] Checkout
* [ ] Integração com Gateway de Pagamento
* [ ] Deploy

---

# 🎯 Objetivos

* Democratizar o comércio eletrônico.
* Reduzir custos para pequenos empreendedores.
* Desenvolver uma arquitetura escalável.
* Aplicar boas práticas de Engenharia de Software.
* Construir uma aplicação segura e preparada para crescimento.

---

# 👨‍💻 Equipe

| Integrante                | Função        |
| ------------------------- | ------------- |
| Gabriel Vitório Gonçalves | Desenvolvedor |
| Lucas Leal de Oliveira    | Desenvolvedor |
| Yuri David Arins Cidral   | Desenvolvedor |

---

# 📚 Documentação

* Arquitetura C4
* Levantamento de Requisitos
* Protótipos (Figma)
* Modelo de Dados
* Relatórios Técnicos

---

# 📄 Licença

Este projeto está licenciado sob a licença **MIT**.

---

<div align="center">

### ⭐ Se este projeto foi útil para você, considere deixar uma estrela no repositório!

Desenvolvido com ❤️ por **Gabriel Vitório Gonçalves**, **Lucas Leal de Oliveira** e **Yuri David Arins Cidral**.

</div>

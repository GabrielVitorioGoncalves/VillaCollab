<div align="center">

#Villa Collab Marketplace

### Plataforma para comércio eletrônico

Uma plataforma moderna desenvolvida para conectar pequenos empreendedores a clientes em um único ambiente digital, utilizando arquitetura Multi-Tenant, foco em escalabilidade, segurança e experiência do usuário.
Este projeto está sendo desenvolvido como parte do PAC extensionista do curso de Engenharia de Software do Centro Universitário Católica de Santa Catarina.

<br>

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange?style=for-the-badge)

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

---

#Sobre o Projeto

O Villa Collab Marketplace é um marketplace colaborativo criado para facilitar a entrada de pequenos empreendedores da Villa Collab no comércio eletrônico.

Ao invés de cada comerciante precisar manter sua própria loja virtual, diversos lojistas compartilham uma única plataforma, mantendo seus dados totalmente isolados.

O projeto foi concebido utilizando boas práticas de Engenharia de Software, Arquitetura de Sistemas, Segurança da Informação e Desenvolvimento Web.

---

#Funcionalidades

##Cliente

* Cadastro e autenticação
* Navegação por lojas
* Busca de produtos
* Visualização de detalhes dos produtos
* Carrinho de compras
* Realização de pedidos
* Acompanhamento dos pedidos

---

##Lojista

* Gerenciamento da loja
* Gerenciamento de produtos
* Controle de estoque
* Gerenciamento de pedidos
* Atualização das informações da loja

---

##Administrador

- Cadastro e gerenciamento de usuários
- Cadastro e gerenciamento de lojas
- Controle de permissões
- Auditoria
- Monitoramento da plataforma

---

#Protótipo

O design da aplicação foi desenvolvido no Figma, permitindo validar toda a experiência do usuário antes da implementação.

###Acesse o protótipo
https://www.figma.com/design/5ubGBdbOpjNCYsWnDTHvlf/Collab?node-id=0-1

---

#Arquitetura

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

#Tecnologias

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

#Segurança

A segurança foi considerada desde o planejamento da aplicação.

###Autenticação

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

### Conformidade

- LGPD
- OWASP Top 10
- ISO/IEC 27001

---

## Testes

Durante o desenvolvimento serão realizados testes para validar:

* autenticação;
* gerenciamento de usuários;
* gerenciamento de produtos;
* processamento de pedidos;
* upload de imagens;
* permissões de acesso;
* isolamento dos dados entre lojistas;
* segurança da aplicação.

---

#Estrutura do Projeto

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

# Entre na pasta

cd villa-collab/frontend

# Instale as dependências

npm install

(Repita o mesmo com a pasta /backend)
# Execute a aplicação

npm run dev
```

---

# Roadmap MVP

- [x] Levantamento de requisitos
- [x] Modelagem da arquitetura
- [x] Prototipação no Figma
- [ ] Modelagem do banco de dados
- [ ] Sistema de autenticação
- [ ] Cadastro de usuários
- [ ] Cadastro de lojas
- [ ] Cadastro de produtos
- [ ] Dashboard do Lojista
- [ ] Upload de imagens
- [ ] Carrinho de compras
- [ ] Checkout
- [ ] Gateway de pagamento
- [ ] Deploy

---

# Documentação

- Diagramas C4
- Arquitetura da aplicação
- Levantamento de Requisitos
- Mapa de Riscos
- Protótipos da Interface
- Relatórios Técnicos
(Em pasta /docs)

---

#Equipe

| Nome | GitHub |
|-------|--------|
| Gabriel Vitório Gonçalves | @GabrielVitorioGoncalves |
| Lucas Leal de Oliveira    | @Lucas-Leal-Oliveira05 | 
| Yuri David Arins Cidral   | @YuriDavid1 |

---

## Licença

Este projeto possui fins acadêmicos e foi desenvolvido como atividade extensionista do curso de Engenharia de Software do Centro Universitário Católica de Santa Catarina.

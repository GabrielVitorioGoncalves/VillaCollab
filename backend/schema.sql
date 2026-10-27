-- 1. Tabela de Lojas (Tenants)
CREATE TABLE IF NOT EXISTS public.lojas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Perfis de Usuários (RBAC)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    loja_id UUID REFERENCES public.lojas(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'cliente', -- 'admin', 'lojista', 'cliente'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Produtos vinculada à Loja
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL,
    estoque INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente',
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Itens dos Pedidos
CREATE TABLE IF NOT EXISTS public.itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10, 2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- Funções auxiliares para obter informações do usuário autenticado
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT role
    FROM public.usuarios
    WHERE id = (SELECT auth.uid())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.get_user_loja_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT loja_id
    FROM public.usuarios
    WHERE id = (SELECT auth.uid())
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_user_loja_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_loja_id() TO authenticated;

-- polices de loja
CREATE POLICY "Todos podem visualizar lojas"
ON public.lojas
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Lojista pode criar loja"
ON public.lojas
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.get_user_role()) IN ('lojista', 'admin')
);

CREATE POLICY "Lojista pode editar sua loja"
ON public.lojas
FOR UPDATE
TO authenticated
USING (
    (SELECT private.get_user_role()) = 'admin'
    OR id = (SELECT private.get_user_loja_id())
)
WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR id = (SELECT private.get_user_loja_id())
);

CREATE POLICY "Admin pode excluir loja"
ON public.lojas
FOR DELETE
TO authenticated
USING (
    (SELECT private.get_user_role()) = 'admin'
);

-- polices de usuario
CREATE POLICY "Usuário pode visualizar seu próprio perfil"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
);

CREATE POLICY "Usuário pode criar seu próprio perfil"
ON public.usuarios
FOR INSERT
TO authenticated
WITH CHECK (
    id = (SELECT auth.uid())
);

CREATE POLICY "Usuário pode editar seu próprio perfil"
ON public.usuarios
FOR UPDATE
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
)
WITH CHECK (
    id = (SELECT auth.uid())
    OR (SELECT private.get_user_role()) = 'admin'
);

CREATE POLICY "Admin pode excluir usuário"
ON public.usuarios
FOR DELETE
TO authenticated
USING (
    (SELECT private.get_user_role()) = 'admin'
);

-- polices de produtos

CREATE POLICY "Todos podem visualizar produtos"
ON public.produtos
FOR SELECT
TO anon, authenticated
USING (true);

-- lojista cadastrar produtos apenas para sua loja
CREATE POLICY "Lojista pode criar produtos da sua loja"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR loja_id = (SELECT private.get_user_loja_id())
);

-- Lojista pode editar somente produtos da própria loja
CREATE POLICY "Lojista pode editar produtos da sua loja"
ON public.produtos
FOR UPDATE
TO authenticated
USING (
    (SELECT private.get_user_role()) = 'admin'
    OR loja_id = (SELECT private.get_user_loja_id())
)
WITH CHECK (
    (SELECT private.get_user_role()) = 'admin'
    OR loja_id = (SELECT private.get_user_loja_id())
);

-- Lojista pode excluir somente produtos da própria loja
CREATE POLICY "Lojista pode excluir produtos da sua loja"
ON public.produtos
FOR DELETE
TO authenticated
USING (
    (SELECT private.get_user_role()) = 'admin'
    OR loja_id = (SELECT private.get_user_loja_id())
);

-- polices de pedido

CREATE POLICY "Cliente pode criar seus pedidos"
ON public.pedidos
FOR INSERT
TO authenticated
WITH CHECK (
    usuario_id = (SELECT auth.uid())
);

-- Cliente pode visualizar seus pedidos
CREATE POLICY "Cliente pode visualizar seus pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
    usuario_id = (SELECT auth.uid())
    OR loja_id = (SELECT private.get_user_loja_id())
    OR (SELECT private.get_user_role()) = 'admin'
);

-- Lojista pode atualizar pedidos da própria loja:
CREATE POLICY "Lojista pode atualizar pedidos da sua loja"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (
    loja_id = (SELECT private.get_user_loja_id())
    OR (SELECT private.get_user_role()) = 'admin'
)
WITH CHECK (
    loja_id = (SELECT private.get_user_loja_id())
    OR (SELECT private.get_user_role()) = 'admin'
);

-- admin pode excluir
CREATE POLICY "Admin pode excluir pedidos"
ON public.pedidos
FOR DELETE
TO authenticated
USING (
    (SELECT private.get_user_role()) = 'admin'
);

-- polices de itens_pedido
-- Cliente pode visualizar itens dos próprios pedidos:

CREATE POLICY "Cliente pode visualizar itens dos seus pedidos"
ON public.itens_pedido
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pedidos p
        WHERE p.id = pedido_id
        AND (
            p.usuario_id = (SELECT auth.uid())
            OR p.loja_id = (SELECT private.get_user_loja_id())
            OR (SELECT private.get_user_role()) = 'admin'
        )
    )
);

-- Cliente pode inserir item no próprio pedido:
CREATE POLICY "Cliente pode adicionar itens ao seu pedido"
ON public.itens_pedido
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.pedidos p
        WHERE p.id = pedido_id
        AND p.usuario_id = (SELECT auth.uid())
    )
);

-- Lojista pode atualizar itens dos pedidos da própria loja:
CREATE POLICY "Lojista pode atualizar itens dos pedidos"
ON public.itens_pedido
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pedidos p
        WHERE p.id = pedido_id
        AND (
            p.loja_id = (SELECT private.get_user_loja_id())
            OR (SELECT private.get_user_role()) = 'admin'
        )
    )
);

-- Excluir

CREATE POLICY "Lojista pode excluir itens dos pedidos"
ON public.itens_pedido
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pedidos p
        WHERE p.id = pedido_id
        AND (
            p.loja_id = (SELECT private.get_user_loja_id())
            OR (SELECT private.get_user_role()) = 'admin'
        )
    )
);
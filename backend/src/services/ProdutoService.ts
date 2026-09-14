import { supabase, createSupabaseClient } from '../config/supabase';
import { ProdutoInput, ProdutoUpdateInput } from '../schemas/produtoSchema';

export class ProdutoService {
  async excluirProduto(id: string, userId: string, accessToken: string) {
    const client = createSupabaseClient(accessToken);
    const { data: produto, error: produtoError } = await client
      .from('produtos').select('id, loja_id').eq('id', id).maybeSingle();
    if (produtoError) throw new Error('Erro ao consultar produto');
    if (!produto) return { status: 'not_found' as const };

    const { data: perfil, error: perfilError } = await client
      .from('usuarios').select('role, loja_id').eq('id', userId).maybeSingle();
    if (perfilError) throw new Error('Erro ao verificar permissão de exclusão');
    if (!perfil || perfil.role !== 'lojista' || perfil.loja_id !== produto.loja_id) {
      return { status: 'forbidden' as const };
    }

    const { data: excluido, error } = await client
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('loja_id', produto.loja_id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error('Erro ao excluir produto');
    if (!excluido) return { status: 'not_found' as const };
    return { status: 'deleted' as const };
  }

  async atualizarProduto(id: string, dados: ProdutoUpdateInput, userId: string, accessToken: string) {
    const client = createSupabaseClient(accessToken);
    const { data: produto, error: produtoError } = await client
      .from('produtos').select('id, loja_id').eq('id', id).maybeSingle();
    if (produtoError) throw new Error('Erro ao consultar produto');
    if (!produto) return { status: 'not_found' as const };

    const { data: perfil, error: perfilError } = await client
      .from('usuarios').select('role, loja_id').eq('id', userId).maybeSingle();
    if (perfilError) throw new Error('Erro ao verificar permissão de edição');
    if (!perfil || perfil.role !== 'lojista' || perfil.loja_id !== produto.loja_id) {
      return { status: 'forbidden' as const };
    }

    const { data: atualizado, error } = await client
      .from('produtos')
      .update(dados)
      .eq('id', id)
      .eq('loja_id', produto.loja_id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error('Erro ao atualizar produto');
    // Não retornar sucesso se o registro desaparecer ou mudar de loja entre as consultas.
    if (!atualizado) return { status: 'not_found' as const };
    return { status: 'updated' as const, produto: atualizado };
  }

  async buscarProdutoPorId(id: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error('Erro ao buscar produto');
    return data;
  }

  async criarProduto(dados: ProdutoInput, userId: string, accessToken: string) {
    const client = createSupabaseClient(accessToken);
    const { data: perfil, error: perfilError } = await client
      .from('usuarios')
      .select('role, loja_id')
      .eq('id', userId)
      .maybeSingle();

    if (perfilError) throw new Error('Erro ao verificar permissão de cadastro');
    // O perfil deve ser administrado de forma confiável no Supabase.
    // Não há concessão de acesso global a administradores nesta etapa.
    if (!perfil || perfil.role !== 'lojista' || perfil.loja_id !== dados.loja_id) return null;

    const { data, error } = await client
      .from('produtos')
      .insert(dados)
      .select()
      .single();

    if (error || !data) throw new Error('Erro ao criar produto');
    return data;
  }

  async listarProdutos(loja_id: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('loja_id', loja_id);

    if (error) throw new Error('Erro ao buscar produtos');
    return data ?? [];
  }
}

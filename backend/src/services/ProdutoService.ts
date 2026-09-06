import { supabase } from '../config/supabase';
import { ProdutoInput } from '../schemas/produtoSchema';

export class ProdutoService {
  async criarProduto(dados: ProdutoInput) {
    const { data, error } = await supabase
      .from('produtos')
      .insert(dados)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar produto: ${error.message}`);
    return data;
  }

  async listarProdutos(loja_id: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('loja_id', loja_id);

    if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);
    return data;
  }
}
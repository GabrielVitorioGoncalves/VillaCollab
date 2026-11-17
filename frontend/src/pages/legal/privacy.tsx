import { LegalShell } from "../../components/layout/legalShell";

export function PrivacyPage() {
  return (
    <LegalShell title="Política de privacidade" updatedAt="novembro de 2026">
      <section>
        <p>
          Aqui explicamos quais dados a Villa Collab guarda, para que usa e com quem compartilha, seguindo a Lei Geral
          de Proteção de Dados (LGPD). Não vendemos seus dados.
        </p>
      </section>

      <section>
        <h2>O que guardamos</h2>
        <ul>
          <li>Cadastro: nome, e-mail e senha. A senha fica criptografada e ninguém da equipe consegue lê-la.</li>
          <li>Perfil: telefone e endereço de entrega, se você preencher.</li>
          <li>Pedidos: produtos, valores, endereço de entrega e andamento.</li>
          <li>Carrinho e avaliações que você fizer.</li>
          <li>
            Dados técnicos: o endereço IP de cada acesso, usado para bloquear excesso de tentativas de login e na
            verificação anti-robô.
          </li>
        </ul>
      </section>

      <section>
        <h2>Para que usamos</h2>
        <ul>
          <li>Entrar na sua conta, confirmar o e-mail e recuperar a senha.</li>
          <li>Registrar seus pedidos e mostrar o andamento em Meus pedidos.</li>
          <li>Montar a mensagem do pedido que você envia para a loja pelo WhatsApp.</li>
          <li>Proteger a plataforma contra acessos indevidos.</li>
        </ul>
      </section>

      <section>
        <h2>Com quem compartilhamos</h2>
        <ul>
          <li>
            A loja do seu pedido vê seu nome, e-mail, telefone, endereço de entrega e os produtos escolhidos, porque
            precisa deles para combinar o pagamento e entregar.
          </li>
          <li>
            Ao abrir o WhatsApp, a mensagem com os itens, o total e o endereço vai pela sua conta do WhatsApp, e você
            pode editá-la antes de enviar.
          </li>
          <li>
            Serviços que fazem o site funcionar: Supabase (banco de dados e login), Render (hospedagem) e Cloudflare
            Turnstile (verificação anti-robô).
          </li>
        </ul>
      </section>

      <section>
        <h2>No seu navegador</h2>
        <p>
          A sessão de login fica guardada só enquanto a aba estiver aberta. Os produtos do carrinho de quem ainda não
          entrou ficam salvos no navegador até a compra ou até você removê-los.
        </p>
      </section>

      <section>
        <h2>Seus direitos</h2>
        <ul>
          <li>Ver e corrigir seus dados: em Meu perfil.</li>
          <li>
            Excluir sua conta: em Meu perfil, na opção Excluir minha conta. Apagamos nome, telefone, endereços e
            comentários das avaliações. Pedidos já concluídos continuam no histórico da loja, sem seus dados pessoais.
          </li>
          <li>Sem pedido em andamento, a conta é excluída na hora. Com pedido em andamento, é preciso esperar a entrega ou cancelar antes.</li>
        </ul>
      </section>

      <section>
        <h2>Contato</h2>
        <p>
          Para pedir acesso, correção ou exclusão dos seus dados, ou tirar dúvidas sobre esta política, escreva para{" "}
          <a href="mailto:villacollab.app@gmail.com" className="underline">villacollab.app@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}

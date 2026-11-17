import { Link } from "react-router-dom";

import { LegalShell } from "../../components/layout/legalShell";

export function TermsPage() {
  return (
    <LegalShell title="Termos de uso" updatedAt="novembro de 2026">
      <section>
        <p>
          A Villa Collab reúne lojas independentes em um só lugar. Você encontra os produtos aqui, monta o pedido e
          combina pagamento e entrega direto com a loja, pelo WhatsApp. Ao criar uma conta ou fazer um pedido, você
          concorda com as regras abaixo.
        </p>
      </section>

      <section>
        <h2>Sua conta</h2>
        <ul>
          <li>Use seu nome e um e-mail que seja seu. Precisamos dele para confirmar a conta e recuperar a senha.</li>
          <li>A senha é pessoal. Se desconfiar que alguém a conhece, troque em Meu perfil.</li>
          <li>Você pode excluir sua conta quando quiser, em Meu perfil.</li>
        </ul>
      </section>

      <section>
        <h2>Pedidos e pagamento</h2>
        <ul>
          <li>Ao finalizar, o pedido é registrado e os produtos ficam reservados para você.</li>
          <li>
            O pagamento é combinado com a loja na conversa do WhatsApp. A Villa Collab não recebe nem guarda
            pagamentos, e não pede dados de cartão.
          </li>
          <li>Se a loja não confirmar o pedido em até 48 horas, ele é cancelado e os produtos voltam ao estoque.</li>
          <li>Enquanto a loja não confirmar, você pode cancelar o pedido em Meus pedidos.</li>
          <li>
            Preço, estoque, prazo, entrega, troca e devolução são responsabilidade de cada loja. Seus direitos de
            consumidor continuam valendo nas compras feitas com elas.
          </li>
        </ul>
      </section>

      <section>
        <h2>Avaliações</h2>
        <p>
          Só quem recebeu o pedido pode avaliar o produto, e a loja não avalia os próprios produtos. Escreva sobre a
          sua experiência real de compra.
        </p>
      </section>

      <section>
        <h2>Lojas</h2>
        <ul>
          <li>As contas de lojista são criadas pela administração da plataforma.</li>
          <li>Cada loja mantém um WhatsApp válido e informações corretas sobre os produtos.</li>
          <li>Lojas que enganem clientes ou descumpram estas regras podem ser desativadas.</li>
        </ul>
      </section>

      <section>
        <h2>Mudanças nestes termos</h2>
        <p>
          Se as regras mudarem, a data no topo desta página é atualizada. O que fazemos com os seus dados está
          explicado na <Link to="/privacidade" className="underline">Política de privacidade</Link>.
        </p>
      </section>
    </LegalShell>
  );
}

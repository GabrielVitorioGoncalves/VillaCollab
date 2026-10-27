import { useState, type FormEvent } from "react";
import {
  Bell,
  Clock,
  Save,
  Store,
} from "lucide-react";

import { PageHeader } from "../../components/layout/pageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useStore } from "../../components/layout/storeContext";
import { errorMessage } from "../../lib/api";
import { toNumber } from "../../lib/format";
import { updateStore } from "../../lib/services";

export function StoreSettings() {
  const { loja, setLoja } = useStore();
  const [acceptOrders, setAcceptOrders] = useState(loja.aceita_pedidos ?? true);
  const [showStock, setShowStock] = useState(loja.exibir_estoque ?? true);
  const [emailNotifications, setEmailNotifications] = useState(loja.notificacoes?.email ?? true);
  const [orderNotifications, setOrderNotifications] = useState(loja.notificacoes?.pedidos ?? true);
  const [lowStockNotifications, setLowStockNotifications] = useState(loja.notificacoes?.estoque_baixo ?? false);
  const [autoConfirm, setAutoConfirm] = useState(loja.confirmar_automaticamente ?? false);
  const [preparationTime, setPreparationTime] = useState(
    loja.prazo_preparo_dias === null || loja.prazo_preparo_dias === undefined ? "" : String(loja.prazo_preparo_dias),
  );
  const [minimumOrder, setMinimumOrder] = useState(String(toNumber(loja.pedido_minimo)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const prazo = preparationTime.trim();
    if (prazo && (!/^\d+$/.test(prazo) || Number(prazo) > 365)) {
      return setError("O prazo de preparação precisa ser um número inteiro de 0 a 365 dias.");
    }
    const minimo = minimumOrder.trim().replace(",", ".") || "0";
    if (!/^\d+(\.\d{1,2})?$/.test(minimo)) {
      return setError("O valor mínimo precisa ser 0 ou mais, com até 2 casas decimais.");
    }

    setSaving(true);
    setError("");
    try {
      const updated = await updateStore(loja.id, {
        aceita_pedidos: acceptOrders,
        exibir_estoque: showStock,
        confirmar_automaticamente: autoConfirm,
        prazo_preparo_dias: prazo ? Number(prazo) : null,
        pedido_minimo: Number(minimo),
        notificacoes: {
          email: emailNotifications,
          pedidos: orderNotifications,
          estoque_baixo: lowStockNotifications,
        },
      });
      setLoja(updated);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie as preferências e o funcionamento da sua loja."
      />

      <form onSubmit={handleSave} className="space-y-6" noValidate>
        {/* Operação da loja */}
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
              <Store size={20} className="text-text" />
            </div>

            <div>
              <h2 className="font-semibold text-text">
                Operação da loja
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Defina como sua loja funciona no marketplace.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            <SettingToggle
              title="Receber novos pedidos"
              description="Desligado, a loja continua visível, mas ninguém consegue finalizar compra nela."
              checked={acceptOrders}
              onChange={(value) => {
                setAcceptOrders(value);
                setSaved(false);
              }}
            />

            <SettingToggle
              title="Exibir disponibilidade de estoque"
              description="Mostra aos clientes quantas unidades restam de cada produto."
              checked={showStock}
              onChange={(value) => {
                setShowStock(value);
                setSaved(false);
              }}
            />

            <SettingToggle
              title="Confirmar pedidos automaticamente"
              description="Novos pedidos já entram como confirmados, sem esperar sua aprovação."
              checked={autoConfirm}
              onChange={(value) => {
                setAutoConfirm(value);
                setSaved(false);
              }}
            />
          </div>
        </Card>

        {/* Preferências de pedido */}
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
              <Clock size={20} className="text-text" />
            </div>

            <div>
              <h2 className="font-semibold text-text">
                Preferências de pedidos
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Configure os valores e prazos padrão.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="preparationTime"
                className="mb-2 block text-sm font-medium text-text"
              >
                Prazo de preparação (dias)
              </label>

              <input
                id="preparationTime"
                type="number"
                min="0"
                step="1"
                value={preparationTime}
                onChange={(event) => {
                  setPreparationTime(event.target.value);
                  setSaved(false);
                }}
                max="365"
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />

              <p className="mt-1 text-xs text-text-secondary">
                Prazo estimado para preparar um pedido. Aparece na página da loja; deixe vazio para não exibir.
              </p>
            </div>

            <div>
              <label
                htmlFor="minimumOrder"
                className="mb-2 block text-sm font-medium text-text"
              >
                Valor mínimo do pedido (R$)
              </label>

              <input
                id="minimumOrder"
                type="number"
                min="0"
                step="0.01"
                value={minimumOrder}
                onChange={(event) => {
                  setMinimumOrder(event.target.value);
                  setSaved(false);
                }}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />

              <p className="mt-1 text-xs text-text-secondary">
                Use 0 para não estabelecer um valor mínimo. Vale para o total de produtos da loja no pedido.
              </p>
            </div>
          </div>
        </Card>

        {/* Notificações */}
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary">
              <Bell size={20} className="text-text" />
            </div>

            <div>
              <h2 className="font-semibold text-text">
                Notificações
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Escolha quais avisos deseja receber.
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            <SettingToggle
              title="Notificações por e-mail"
              description="A preferência fica salva. O envio de e-mails ainda não está configurado no servidor."
              checked={emailNotifications}
              onChange={(value) => {
                setEmailNotifications(value);
                setSaved(false);
              }}
            />

            <SettingToggle
              title="Atualizações de pedidos"
              description="Mostra no painel um aviso dos pedidos que aguardam sua confirmação."
              checked={orderNotifications}
              onChange={(value) => {
                setOrderNotifications(value);
                setSaved(false);
              }}
            />

            <SettingToggle
              title="Estoque baixo"
              description="Mostra no painel os produtos ativos com 5 unidades ou menos."
              checked={lowStockNotifications}
              onChange={(value) => {
                setLowStockNotifications(value);
                setSaved(false);
              }}
            />
          </div>
        </Card>

        {/* Salvar */}
        <div className="flex flex-col-reverse justify-end  gap-3 sm:flex-row">
          <Button type="submit" disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {saved && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            Configurações salvas com sucesso.
          </div>
        )}
      </form>
    </div>
  );
}

interface SettingToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-1 text-sm leading-5 text-text-secondary">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={toggleClassName(checked)}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function toggleClassName(checked: boolean) {
  return `relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    checked ? "bg-primary" : "bg-zinc-300"
  }`;
}
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";
import { RequestStatus } from "../../components/ui/requestStatus";
import { useRequest } from "../../hooks/useRequest";
import {
  formatCep,
  toAddressForm,
  toEndereco,
  validateAddress,
  type AddressErrors,
  type AddressForm,
} from "../../lib/address";
import { errorMessage } from "../../lib/api";
import { changeEmail, changePassword, getMe, updateMe } from "../../lib/services";
import { getSession, updateSessionUser } from "../../lib/session";
import type { Usuario } from "../../types/api";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

interface Feedback {
  type: "success" | "error";
  text: string;
}

function FeedbackText({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.type === "error" ? "alert" : "status"}
      className={`mt-4 text-sm ${feedback.type === "error" ? "text-danger" : "text-green-700"}`}
    >
      {feedback.text}
    </p>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const addressRef = useRef<HTMLDivElement>(null);
  const profile = useRequest("perfil", getMe);
  const user = profile.data;

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [personalFeedback, setPersonalFeedback] = useState<Feedback | null>(null);
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [address, setAddress] = useState<AddressForm>(toAddressForm());
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [addressFeedback, setAddressFeedback] = useState<Feedback | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // A API devolve o e-mail no /auth/me; o do login fica como reserva.
  const currentEmail = user?.email ?? getSession()?.email ?? "";

  const applyUser = (updated: Usuario) => {
    profile.mutate(updated);
    updateSessionUser(updated);
  };

  const startEditingPersonal = () => {
    if (!user) return;
    setName(user.nome);
    setEmail(currentEmail);
    setPhone(user.telefone ?? "");
    setPersonalFeedback(null);
    setEditingPersonal(true);
  };

  const startEditingAddress = () => {
    if (!user) return;
    setAddress(toAddressForm(user.endereco));
    setAddressErrors({});
    setAddressFeedback(null);
    setEditingAddress(true);
  };

  const handleSavePersonal = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      setPersonalFeedback({ type: "error", text: "Informe seu nome completo." });
      return;
    }
    if (!/^[0-9()+\-\s]*$/.test(phone) || phone.trim().length > 20) {
      setPersonalFeedback({ type: "error", text: "Telefone com até 20 números." });
      return;
    }

    setSavingPersonal(true);
    setPersonalFeedback(null);
    try {
      const nameChanged = name.trim() !== user.nome;
      const phoneChanged = phone.trim() !== (user.telefone ?? "");
      if (nameChanged || phoneChanged) {
        applyUser(await updateMe({ nome: name.trim(), telefone: phone.trim() || null }));
      }

      const emailChanged = email.trim().toLowerCase() !== currentEmail.toLowerCase();
      if (emailChanged) {
        await changeEmail(email.trim());
        setPersonalFeedback({
          type: "success",
          text: `Enviamos um link para ${email.trim()}. O e-mail muda depois da confirmação.`,
        });
      } else {
        setPersonalFeedback({ type: "success", text: "Dados atualizados." });
      }
      setEditingPersonal(false);
    } catch (caught) {
      setPersonalFeedback({ type: "error", text: errorMessage(caught) });
    } finally {
      setSavingPersonal(false);
    }
  };

  const updateAddressField = (field: keyof AddressForm, value: string) => {
    setAddress((current) => ({ ...current, [field]: field === "cep" ? formatCep(value) : value }));
    setAddressErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSaveAddress = async () => {
    const errors = validateAddress(address, false);
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingAddress(true);
    setAddressFeedback(null);
    try {
      applyUser(await updateMe({ endereco: toEndereco(address, false) }));
      setEditingAddress(false);
      setAddressFeedback({ type: "success", text: "Endereço salvo. Ele vai preenchido nas próximas compras." });
    } catch (caught) {
      setAddressFeedback({ type: "error", text: errorMessage(caught) });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", text: "A nova senha precisa ter pelo menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: "A confirmação não bate com a nova senha." });
      return;
    }

    setSavingPassword(true);
    setPasswordFeedback(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditingPassword(false);
      setPasswordFeedback({ type: "success", text: "Senha alterada." });
    } catch (caught) {
      setPasswordFeedback({ type: "error", text: errorMessage(caught) });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-10">
        {/* Cabeçalho */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Meu perfil
          </h1>
        </section>

        {!user ? (
          <RequestStatus
            loading={profile.loading}
            error={profile.error}
            onRetry={profile.reload}
            loadingText="Carregando perfil..."
          />
        ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Menu lateral */}
          <aside>
            <Card className="p-4">
              <div className="flex flex-col items-center border-b border-border pb-5">
                <div
                  className="
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-full
                    bg-background-secondary
                    text-2xl
                    font-semibold
                    text-text
                  "
                >
                  {initials(user.nome)}
                </div>

                <h2 className="mt-3 font-semibold text-text">
                  {user.nome}
                </h2>

                <p className="mt-1 text-xs text-text-secondary">
                  {currentEmail}
                </p>
              </div>

              <nav className="mt-4 space-y-1">
                <button
                  type="button"
                  aria-current="page"
                  className="
                    w-full
                    rounded-lg
                    bg-background-secondary
                    px-4
                    py-3
                    text-left
                    text-sm
                    font-medium
                    text-text
                  "
                >
                  Meu perfil
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/user/pedidos")}
                  className="
                    w-full
                    rounded-lg
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-text-secondary
                    transition-colors
                    hover:bg-background-secondary
                    hover:text-text
                  "
                >
                  Meus pedidos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="
                    w-full
                    rounded-lg
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-text-secondary
                    transition-colors
                    hover:bg-background-secondary
                    hover:text-text
                  "
                >
                  Endereços
                </button>
              </nav>
            </Card>
          </aside>

          {/* Conteúdo */}
          <div className="space-y-6">
            {/* Informações pessoais */}
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Informações pessoais
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Seus dados básicos de identificação.
                  </p>
                </div>

                {!editingPersonal && (
                  <Button
                    variant="outline"
                    onClick={startEditingPersonal}
                  >
                    Editar
                  </Button>
                )}
              </div>

              <div className="mt-6">
                {editingPersonal ? (
                  <div className="space-y-5">
                    <FormField
                      label="Nome completo"
                      required
                    >
                      <Input
                        value={name}
                        autoComplete="name"
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                      />
                    </FormField>

                    <FormField
                      label="E-mail"
                      required
                      helperText="Ao trocar, enviamos um link de confirmação para o novo e-mail."
                    >
                      <Input
                        type="email"
                        value={email}
                        autoComplete="email"
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Telefone">
                      <Input
                        value={phone}
                        type="tel"
                        autoComplete="tel"
                        placeholder="(47) 99999-9999"
                        onChange={(event) =>
                          setPhone(event.target.value)
                        }
                      />
                    </FormField>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        disabled={savingPersonal}
                        onClick={() =>
                          setEditingPersonal(false)
                        }
                      >
                        Cancelar
                      </Button>

                      <Button
                        onClick={handleSavePersonal}
                        disabled={savingPersonal}
                      >
                        {savingPersonal ? "Salvando..." : "Salvar alterações"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-secondary">
                        Nome completo
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {user.nome}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary">
                        E-mail
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {currentEmail || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary">
                        Telefone
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {user.telefone || "—"}
                      </p>
                    </div>
                  </div>
                )}

                <FeedbackText feedback={personalFeedback} />
              </div>
            </Card>

            {/* Endereço */}
            <div ref={addressRef} className="scroll-mt-24">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Endereço de entrega
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Endereço utilizado para suas compras.
                  </p>
                </div>

                {!editingAddress && (
                  <Button
                    variant="outline"
                    onClick={startEditingAddress}
                  >
                    {user.endereco ? "Editar" : "Adicionar"}
                  </Button>
                )}
              </div>

              <div className="mt-6">
                {editingAddress ? (
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                      <FormField
                        label="CEP"
                        required
                        error={addressErrors.cep}
                      >
                        <Input
                          value={address.cep}
                          error={!!addressErrors.cep}
                          inputMode="numeric"
                          autoComplete="postal-code"
                          placeholder="00000-000"
                          onChange={(event) =>
                            updateAddressField("cep", event.target.value)
                          }
                        />
                      </FormField>

                      <FormField
                        label="Rua"
                        required
                        error={addressErrors.rua}
                      >
                        <Input
                          value={address.rua}
                          error={!!addressErrors.rua}
                          autoComplete="address-line1"
                          onChange={(event) =>
                            updateAddressField("rua", event.target.value)
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                      <FormField
                        label="Número"
                        required
                        error={addressErrors.numero}
                      >
                        <Input
                          value={address.numero}
                          error={!!addressErrors.numero}
                          onChange={(event) =>
                            updateAddressField("numero", event.target.value)
                          }
                        />
                      </FormField>

                      <FormField label="Complemento">
                        <Input
                          value={address.complemento}
                          autoComplete="address-line2"
                          onChange={(event) =>
                            updateAddressField("complemento", event.target.value)
                          }
                          placeholder="Apartamento, bloco, casa..."
                        />
                      </FormField>
                    </div>

                    <FormField
                      label="Bairro"
                      required
                      error={addressErrors.bairro}
                    >
                      <Input
                        value={address.bairro}
                        error={!!addressErrors.bairro}
                        onChange={(event) =>
                          updateAddressField("bairro", event.target.value)
                        }
                      />
                    </FormField>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        label="Cidade"
                        required
                        error={addressErrors.cidade}
                      >
                        <Input
                          value={address.cidade}
                          error={!!addressErrors.cidade}
                          autoComplete="address-level2"
                          onChange={(event) =>
                            updateAddressField("cidade", event.target.value)
                          }
                        />
                      </FormField>

                      <FormField
                        label="Estado"
                        required
                        error={addressErrors.estado}
                      >
                        <Input
                          value={address.estado}
                          error={!!addressErrors.estado}
                          maxLength={2}
                          autoComplete="address-level1"
                          onChange={(event) =>
                            updateAddressField("estado", event.target.value.toUpperCase())
                          }
                        />
                      </FormField>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        disabled={savingAddress}
                        onClick={() =>
                          setEditingAddress(false)
                        }
                      >
                        Cancelar
                      </Button>

                      <Button
                        onClick={handleSaveAddress}
                        disabled={savingAddress}
                      >
                        {savingAddress ? "Salvando..." : "Salvar endereço"}
                      </Button>
                    </div>
                  </div>
                ) : user.endereco ? (
                  <div className="rounded-xl border border-border bg-background-secondary p-4">
                    <p className="font-medium text-text">
                      {user.endereco.rua}, {user.endereco.numero}
                    </p>

                    {user.endereco.complemento && (
                      <p className="mt-1 text-sm text-text-secondary">
                        {user.endereco.complemento}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-text-secondary">
                      {user.endereco.bairro}
                    </p>

                    <p className="mt-1 text-sm text-text-secondary">
                      {user.endereco.cidade} - {user.endereco.estado}
                    </p>

                    <p className="mt-1 text-sm text-text-secondary">
                      CEP {user.endereco.cep}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Nenhum endereço cadastrado ainda.
                  </p>
                )}

                <FeedbackText feedback={addressFeedback} />
              </div>
            </Card>
            </div>

            {/* Segurança */}
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Segurança
                  </h2>

                  <p className="mt-1 text-sm text-text-secondary">
                    Gerencie a senha e a segurança da sua conta.
                  </p>
                </div>

                {!editingPassword && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPasswordFeedback(null);
                      setEditingPassword(true);
                    }}
                  >
                    Alterar senha
                  </Button>
                )}
              </div>

              {editingPassword && (
                <div className="mt-6 space-y-5">
                  <FormField label="Senha atual" required>
                    <Input
                      type="password"
                      value={currentPassword}
                      autoComplete="current-password"
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Nova senha" required helperText="Mínimo 8 caracteres.">
                      <Input
                        type="password"
                        value={newPassword}
                        autoComplete="new-password"
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </FormField>

                    <FormField label="Confirmar nova senha" required>
                      <Input
                        type="password"
                        value={confirmPassword}
                        autoComplete="new-password"
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      disabled={savingPassword}
                      onClick={() => {
                        setEditingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      Cancelar
                    </Button>

                    <Button
                      onClick={handleChangePassword}
                      disabled={savingPassword || !currentPassword}
                    >
                      {savingPassword ? "Salvando..." : "Salvar nova senha"}
                    </Button>
                  </div>
                </div>
              )}

              <FeedbackText feedback={passwordFeedback} />
            </Card>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}

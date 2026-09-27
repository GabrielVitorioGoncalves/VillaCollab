import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { FormField } from "../../components/ui/formField";
import { Input } from "../../components/ui/input";

export function ProfilePage() {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);

  const [name, setName] = useState("Teste");
  const [email, setEmail] = useState("teste@email.com");
  const [phone, setPhone] = useState("(47) 99999-9999");

  const [cep, setCep] = useState("89200-000");
  const [street, setStreet] = useState("Rua Exemplo");
  const [number, setNumber] = useState("123");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("Centro");
  const [city, setCity] = useState("Joinville");
  const [state, setState] = useState("SC");

  const handleSavePersonal = () => {
    console.log("Informações pessoais:", {
      name,
      email,
      phone,
    });

    setEditingPersonal(false);
  };

  const handleSaveAddress = () => {
    console.log("Endereço:", {
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    });

    setEditingAddress(false);
  };

  const handleChangePassword = () => {
    console.log("Alterar senha");
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
                  LL
                </div>

                <h2 className="mt-3 font-semibold text-text">
                  {name}
                </h2>

                <p className="mt-1 text-xs text-text-secondary">
                  {email}
                </p>
              </div>

              <nav className="mt-4 space-y-1">
                <button
                  type="button"
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
                    onClick={() => setEditingPersonal(true)}
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
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                      />
                    </FormField>

                    <FormField
                      label="E-mail"
                      required
                    >
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                      />
                    </FormField>

                    <FormField label="Telefone">
                      <Input
                        value={phone}
                        onChange={(event) =>
                          setPhone(event.target.value)
                        }
                      />
                    </FormField>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEditingPersonal(false)
                        }
                      >
                        Cancelar
                      </Button>

                      <Button
                        onClick={handleSavePersonal}
                      >
                        Salvar alterações
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
                        {name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary">
                        E-mail
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary">
                        Telefone
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {phone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Endereço */}
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
                    onClick={() => setEditingAddress(true)}
                  >
                    Editar
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
                      >
                        <Input
                          value={cep}
                          onChange={(event) =>
                            setCep(event.target.value)
                          }
                        />
                      </FormField>

                      <FormField
                        label="Rua"
                        required
                      >
                        <Input
                          value={street}
                          onChange={(event) =>
                            setStreet(event.target.value)
                          }
                        />
                      </FormField>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                      <FormField
                        label="Número"
                        required
                      >
                        <Input
                          value={number}
                          onChange={(event) =>
                            setNumber(event.target.value)
                          }
                        />
                      </FormField>

                      <FormField label="Complemento">
                        <Input
                          value={complement}
                          onChange={(event) =>
                            setComplement(event.target.value)
                          }
                          placeholder="Apartamento, bloco, casa..."
                        />
                      </FormField>
                    </div>

                    <FormField
                      label="Bairro"
                      required
                    >
                      <Input
                        value={neighborhood}
                        onChange={(event) =>
                          setNeighborhood(event.target.value)
                        }
                      />
                    </FormField>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField
                        label="Cidade"
                        required
                      >
                        <Input
                          value={city}
                          onChange={(event) =>
                            setCity(event.target.value)
                          }
                        />
                      </FormField>

                      <FormField
                        label="Estado"
                        required
                      >
                        <Input
                          value={state}
                          maxLength={2}
                          onChange={(event) =>
                            setState(event.target.value)
                          }
                        />
                      </FormField>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEditingAddress(false)
                        }
                      >
                        Cancelar
                      </Button>

                      <Button
                        onClick={handleSaveAddress}
                      >
                        Salvar endereço
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-background-secondary p-4">
                    <p className="font-medium text-text">
                      {street}, {number}
                    </p>

                    {complement && (
                      <p className="mt-1 text-sm text-text-secondary">
                        {complement}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-text-secondary">
                      {neighborhood}
                    </p>

                    <p className="mt-1 text-sm text-text-secondary">
                      {city} - {state}
                    </p>

                    <p className="mt-1 text-sm text-text-secondary">
                      CEP {cep}
                    </p>
                  </div>
                )}
              </div>
            </Card>

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

                <Button
                  variant="outline"
                  onClick={handleChangePassword}
                >
                  Alterar senha
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
import type { Endereco } from "../types/api";

export type AddressForm = Required<Endereco>;
export type AddressErrors = Partial<Record<keyof AddressForm, string>>;

export const emptyAddress: AddressForm = {
  nome: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export function toAddressForm(endereco?: Endereco | null, nome = ""): AddressForm {
  return {
    ...emptyAddress,
    ...(endereco ?? {}),
    nome: endereco?.nome || nome,
    complemento: endereco?.complemento ?? "",
  };
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function validateAddress(form: AddressForm, requireName: boolean): AddressErrors {
  const errors: AddressErrors = {};
  if (requireName && form.nome.trim().length < 2) errors.nome = "Informe o nome de quem recebe.";
  if (!/^\d{5}-?\d{3}$/.test(form.cep.trim())) errors.cep = "CEP com 8 números.";
  if (form.rua.trim().length < 2) errors.rua = "Informe a rua.";
  if (!form.numero.trim()) errors.numero = "Informe o número.";
  if (form.bairro.trim().length < 2) errors.bairro = "Informe o bairro.";
  if (form.cidade.trim().length < 2) errors.cidade = "Informe a cidade.";
  if (!/^[A-Za-z]{2}$/.test(form.estado.trim())) errors.estado = "UF com 2 letras.";
  return errors;
}

export function toEndereco(form: AddressForm, includeName: boolean): Endereco {
  const endereco: Endereco = {
    cep: form.cep.trim(),
    rua: form.rua.trim(),
    numero: form.numero.trim(),
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim(),
    estado: form.estado.trim().toUpperCase(),
  };
  if (form.complemento.trim()) endereco.complemento = form.complemento.trim();
  if (includeName && form.nome.trim()) endereco.nome = form.nome.trim();
  return endereco;
}

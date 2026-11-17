export function telefoneWhatsappValido(telefone: string | null | undefined): boolean {
  const valor = (telefone ?? "").trim();
  if (!valor || valor.length > 20 || !/^\+?[0-9()\-\s]+$/.test(valor)) return false;
  const digitos = valor.replace(/\D/g, "");
  if (!valor.includes("+") && /^[1-9][0-9]{9,10}$/.test(digitos)) return true;
  return /^55[1-9][0-9]{9,10}$/.test(digitos);
}

export function linkConversaWhatsapp(telefone: string | null | undefined): string | null {
  if (!telefoneWhatsappValido(telefone)) return null;
  const digitos = (telefone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

export function linkWhatsappSeguro(url: string | null | undefined): string | null {
  return url && /^https:\/\/wa\.me\/\d{12,13}\?text=[^\s]*$/.test(url) ? url : null;
}

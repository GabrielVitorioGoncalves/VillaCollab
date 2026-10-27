export const generalCategories = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Periféricos",
  "Informática",
  "Áudio",
  "Casa e decoração",
  "Beleza e cuidados pessoais",
  "Esportes",
  "Brinquedos",
  "Livros",
  "Alimentos e bebidas",
];

export const storeCategories = [
  "Moda e acessórios",
  "Casa e decoração",
  "Eletrônicos",
  "Beleza e cuidados pessoais",
  "Esportes",
  "Alimentos e bebidas",
  "Outros",
];

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function uniqueSlug(value: string, taken: string[], fallback: string): string {
  const base = slugify(value) || fallback;
  let candidate = base;
  let index = 2;
  while (taken.includes(candidate)) {
    const suffix = `-${index++}`;
    candidate = `${base.slice(0, 40 - suffix.length)}${suffix}`;
  }
  return candidate;
}

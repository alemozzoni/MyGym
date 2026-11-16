// Colori distinguibili su sfondo scuro, assegnati in modo stabile in base al nome
const PALETTE = ['#ff6b2c', '#0a84ff', '#30d158', '#bf5af2', '#ffd60a', '#64d2ff', '#ff375f', '#ac8e68'];

export function coloreAllenamento(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

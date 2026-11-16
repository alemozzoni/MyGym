import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/** Data locale in formato YYYY-MM-DD (senza problemi di fuso orario) */
export const isoGiorno = (d: Date) => format(d, 'yyyy-MM-dd');
export const oggi = () => isoGiorno(new Date());

export const formatta = (iso: string, schema = 'd MMM yyyy') => format(parseISO(iso), schema, { locale: it });

export const dataEstesa = (iso: string) => {
  const s = format(parseISO(iso), 'EEEE d MMMM yyyy', { locale: it });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const dimensioneFile = (byte: number) =>
  byte < 1024 * 1024 ? `${Math.round(byte / 1024)} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`;

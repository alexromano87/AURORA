/**
 * Formatta un numero in formato italiano (10.000,00)
 * @param value Il valore numerico da formattare
 * @param decimals Numero di decimali (default: 2)
 * @returns Stringa formattata in formato italiano
 */
export function formatItalianNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formatta un prezzo rimuovendo la valuta e usando il formato italiano
 * @param value Il valore del prezzo
 * @param decimals Numero di decimali (default: 2)
 * @returns Stringa formattata senza simbolo di valuta
 */
export function formatPrice(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  return formatItalianNumber(value, decimals);
}

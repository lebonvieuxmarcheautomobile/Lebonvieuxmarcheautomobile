// Normalisation / validation des plaques françaises.
//  - SIV (depuis 2009) : AA-123-AA  (lettres I, O, U interdites ; "SS" interdit)
//  - FNI (ancien)      : 123 ABC 45 (département 2A/2B, DOM 971-976)

export function normalizePlate(input) {
  const compact = String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!compact) return { valid: false, error: 'Saisissez une immatriculation.' };

  const siv = compact.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
  if (siv) {
    const letters = siv[1] + siv[3];
    if (/[IOU]/.test(letters)) {
      return { valid: false, error: 'Les lettres I, O et U ne sont pas utilisées sur les plaques SIV.' };
    }
    if (siv[1] === 'SS' || siv[3] === 'SS') {
      return { valid: false, error: 'La combinaison « SS » n’est pas attribuée.' };
    }
    if (siv[2] === '000') return { valid: false, error: 'Le bloc chiffré 000 n’est pas attribué.' };
    return { valid: true, format: 'SIV', compact, formatted: `${siv[1]}-${siv[2]}-${siv[3]}` };
  }

  const fni = compact.match(/^(\d{1,4})([A-Z]{1,3})(97[1-6]|2A|2B|\d{2})$/);
  if (fni) {
    return { valid: true, format: 'FNI', compact, formatted: `${fni[1]} ${fni[2]} ${fni[3]}` };
  }

  return {
    valid: false,
    error: 'Format non reconnu. Exemples : AB-123-CD (SIV) ou 123 ABC 45 (ancien format).',
  };
}

/** Mise en forme pendant la saisie (SIV uniquement), sans bloquer les autres formats. */
export function formatPlateAsTyped(input) {
  const c = String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (/^[A-Z]{1,2}$/.test(c)) return c;
  const m = c.match(/^([A-Z]{2})(\d{1,3})([A-Z]{0,2})$/);
  if (m) return [m[1], m[2], m[3]].filter(Boolean).join('-');
  return String(input ?? '').toUpperCase();
}

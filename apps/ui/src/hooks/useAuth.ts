/**
 * Hook per gestire l'autenticazione dell'utente.
 *
 * Per ora restituisce sempre 'user_default' come utente corrente,
 * ma può essere facilmente esteso in futuro per supportare:
 * - Login/logout
 * - Gestione sessione
 * - Multi-utente
 */
export function useAuth() {
  // TODO: Implementare sistema di autenticazione completo
  // Per ora usiamo un utente di default
  const userId = 'user_default';
  const isAuthenticated = true;

  return {
    userId,
    isAuthenticated,
    // Future: login, logout, register functions
  };
}

/**
 * Conexão com o Supabase — usada pelo painel (/admin/) e pelas páginas de
 * artigos geradas em functions/.
 *
 * A chave abaixo é a PÚBLICA (publishable ou anon): ela é feita para ficar
 * no navegador. Quem garante que só a Luana escreve são as regras de acesso
 * do banco (supabase/schema.sql). Nunca coloque aqui a chave secreta
 * (secret ou service_role).
 *
 * Ao trocar estes valores, suba o ?v= do import em admin/admin.js.
 */
export const SUPABASE_URL = 'https://otrtlmzponsboqwxknpi.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_iMmtMKx8r93wa88R5hPp4A_72USoAJu';

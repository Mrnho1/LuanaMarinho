import { SUPABASE_URL, SUPABASE_KEY } from '../../scripts/supabase-config.js';

/* Variáveis de ambiente, quando definidas, têm prioridade — permitem apontar
   para outro banco (um teste local, por exemplo) sem mexer no arquivo. */
function conexao(env) {
  return {
    url: env.SUPABASE_URL || SUPABASE_URL,
    key: env.SUPABASE_KEY || SUPABASE_KEY,
  };
}

/** Lê a API REST do Supabase como visitante: só enxerga artigos publicados. */
async function consultar(env, caminho) {
  const { url, key } = conexao(env);
  const res = await fetch(`${url}/rest/v1/${caminho}`, {
    headers: { apikey: key, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Supabase respondeu ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const CAMPOS_LISTA = 'slug,titulo,descricao,imagem_capa,imagem_alt,publicado_em,atualizado_em';

export function listarPublicados(env, { limite = 200, exceto } = {}) {
  let caminho = `artigos?select=${CAMPOS_LISTA}&publicado=eq.true&order=publicado_em.desc&limit=${limite}`;
  if (exceto) caminho += `&slug=neq.${encodeURIComponent(exceto)}`;
  return consultar(env, caminho);
}

export async function buscarPublicado(env, slug) {
  const linhas = await consultar(
    env,
    `artigos?select=${CAMPOS_LISTA},titulo_seo,conteudo&publicado=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`
  );
  return linhas[0] || null;
}

/**
 * /artigos/ — lista dos artigos publicados, montada a cada acesso a partir
 * do Supabase. O HTML já sai pronto para o Google e para as prévias de link.
 */
import { listarPublicados } from '../_lib/supabase.js';
import {
  SITE, NO_ADVOGADA, esc, pagina, respostaHtml, indisponivel,
  dataPorExtenso, breadcrumbLd, bandaContato,
} from '../_lib/layout.js';

const TITULO = 'Artigos sobre Direito Penal | Luana Marinho';
const DESCRICAO =
  'Artigos da advogada criminalista Luana Marinho sobre prisão, audiência de custódia, habeas corpus, júri e execução penal, em linguagem clara.';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/')) {
    return Response.redirect(`${url.origin}/artigos/${url.search}`, 301);
  }

  let artigos;
  try {
    artigos = await listarPublicados(env);
  } catch (erro) {
    console.error(erro);
    return indisponivel();
  }

  const lista = artigos.length
    ? `<ul class="artigos-lista">${artigos.map(cartao).join('')}
        </ul>`
    : `<p class="artigos-vazio">Os primeiros artigos estão sendo preparados. Enquanto isso, conheça as <a href="/#areas">áreas de atuação</a> ou fale diretamente com a advogada.</p>`;

  const corpo = `
    <section class="page-hero band band-dark">
      <div class="wrap">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Artigos</span>
        </nav>
        <p class="kicker"><span class="kicker-line"></span>Conteúdo jurídico</p>
        <h1>Artigos sobre Direito Penal</h1>
        <p class="lead page-lead">Textos da Dra. Luana Marinho que explicam, em linguagem direta, como funcionam a prisão, a defesa e os direitos de quem responde a um processo criminal.</p>
      </div>
    </section>

    <section class="band band-light artigos-indice">
      <div class="wrap">
        ${lista}
      </div>
    </section>
${bandaContato()}`;

  const dados = [
    {
      '@type': 'Blog',
      '@id': `${SITE}/artigos/#blog`,
      url: `${SITE}/artigos/`,
      name: 'Artigos — Luana Marinho Advocacia Criminal',
      description: DESCRICAO,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${SITE}/#site` },
      publisher: { '@id': `${SITE}/#advogada` },
      breadcrumb: { '@id': `${SITE}/artigos/#breadcrumb` },
      blogPost: artigos.map((a) => ({
        '@type': 'BlogPosting',
        headline: a.titulo,
        url: `${SITE}/artigos/${a.slug}/`,
        datePublished: a.publicado_em,
        dateModified: a.atualizado_em,
        ...(a.imagem_capa && { image: a.imagem_capa }),
      })),
    },
    breadcrumbLd('/artigos/', [['Início', '/'], ['Artigos', '/artigos/']]),
    NO_ADVOGADA,
  ];

  return respostaHtml(
    pagina({ titulo: TITULO, descricao: DESCRICAO, caminho: '/artigos/', atual: 'page', dados, corpo })
  );
}

export const onRequestHead = onRequestGet;

function cartao(a) {
  const imagem = a.imagem_capa
    ? `<img src="${esc(a.imagem_capa)}" alt="${esc(a.imagem_alt || '')}" width="1200" height="630" loading="lazy" decoding="async">`
    : `<img src="/assets/img/icone-dourado.png" alt="" width="46" height="36" loading="lazy">`;
  return `
          <li>
            <a class="artigo-card" href="/artigos/${a.slug}/">
              <div class="artigo-card-img${a.imagem_capa ? '' : ' artigo-card-img--marca'}">${imagem}</div>
              <div class="artigo-card-corpo">
                <time datetime="${esc(a.publicado_em)}">${dataPorExtenso(a.publicado_em)}</time>
                <h2>${esc(a.titulo)}</h2>
                <p>${esc(a.descricao)}</p>
                <span class="artigo-card-mais">Ler artigo <span aria-hidden="true">→</span></span>
              </div>
            </a>
          </li>`;
}

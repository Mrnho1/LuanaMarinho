/**
 * /artigos/<slug>/ — página de um artigo, montada a cada acesso a partir do
 * Supabase. Rascunhos não aparecem: a consulta é anônima e o banco só
 * entrega o que está publicado.
 */
import { buscarPublicado, listarPublicados } from '../_lib/supabase.js';
import { sanitizarHtml } from '../_lib/sanitize.js';
import {
  SITE, OG_PADRAO, NO_ADVOGADA, AREAS, esc, pagina, respostaHtml,
  naoEncontrado, indisponivel, dataPorExtenso, breadcrumbLd, bandaContato,
} from '../_lib/layout.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PALAVRAS_POR_MINUTO = 200;

export async function onRequestGet({ request, params, env }) {
  const { slug } = params;
  if (!SLUG.test(slug)) return naoEncontrado(env, request);

  const url = new URL(request.url);
  if (!url.pathname.endsWith('/')) {
    return Response.redirect(`${url.origin}/artigos/${slug}/${url.search}`, 301);
  }

  let artigo, outros;
  try {
    [artigo, outros] = await Promise.all([
      buscarPublicado(env, slug),
      listarPublicados(env, { limite: 3, exceto: slug }),
    ]);
  } catch (erro) {
    console.error(erro);
    return indisponivel();
  }
  if (!artigo) return naoEncontrado(env, request);

  const caminho = `/artigos/${slug}/`;
  const conteudo = await sanitizarHtml(artigo.conteudo, SITE);
  const palavras = conteudo.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutos = Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO));
  const titulo = artigo.titulo_seo || `${artigo.titulo} | Luana Marinho`;
  const imagem = artigo.imagem_capa || OG_PADRAO;
  const imagemAlt = artigo.imagem_capa ? artigo.imagem_alt || artigo.titulo : 'Luana Marinho — Advocacia Criminal';

  const capa = artigo.imagem_capa
    ? `
        <figure class="artigo-capa">
          <img src="${esc(artigo.imagem_capa)}" alt="${esc(artigo.imagem_alt || '')}" width="1200" height="630" fetchpriority="high">
        </figure>`
    : '';

  const leiaTambem = outros.length
    ? `
        <section class="prose-block">
          <h2>Leia também</h2>
          <ul class="related-list">
            ${outros.map((o) => `<li><a href="/artigos/${o.slug}/">${esc(o.titulo)}</a></li>`).join('\n            ')}
          </ul>
        </section>`
    : '';

  const corpo = `
    <section class="page-hero artigo-hero band band-dark">
      <div class="wrap">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <a href="/artigos/">Artigos</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">${esc(artigo.titulo)}</span>
        </nav>
        <p class="kicker"><span class="kicker-line"></span><time datetime="${esc(artigo.publicado_em)}">${dataPorExtenso(artigo.publicado_em)}</time></p>
        <h1>${esc(artigo.titulo)}</h1>
        ${artigo.descricao ? `<p class="lead page-lead">${esc(artigo.descricao)}</p>` : ''}
        <p class="artigo-meta">Por <a href="/#luana">Dra. Luana Marinho</a> · OAB/SP 497.409 · ${minutos} min de leitura</p>
      </div>
    </section>

    <article class="band band-light">
      <div class="wrap page-prose">${capa}
        <div class="artigo-conteudo">
${conteudo}
        </div>

        <aside class="artigo-autora">
          <picture>
            <source srcset="/assets/img/luana-marinho.webp" type="image/webp">
            <img src="/assets/img/luana-marinho.jpg" alt="Dra. Luana da Silva Marinho" width="84" height="84" loading="lazy">
          </picture>
          <p>
            <strong>Dra. Luana da Silva Marinho</strong>
            Advogada criminalista, OAB/SP 497.409. Atua na defesa de pessoas presas ou investigadas, em São Paulo e em todo o Brasil.
          </p>
        </aside>
${leiaTambem}
        <section class="prose-block">
          <h2>Áreas de atuação</h2>
          <ul class="related-list">
            ${AREAS.map(([href, nome]) => `<li><a href="${href}">${nome}</a></li>`).join('\n            ')}
          </ul>
        </section>
      </div>
    </article>
${bandaContato()}`;

  const dados = [
    {
      '@type': 'BlogPosting',
      '@id': `${SITE}${caminho}#artigo`,
      mainEntityOfPage: `${SITE}${caminho}`,
      url: `${SITE}${caminho}`,
      headline: artigo.titulo,
      description: artigo.descricao,
      image: imagem,
      datePublished: artigo.publicado_em,
      dateModified: artigo.atualizado_em,
      wordCount: palavras,
      inLanguage: 'pt-BR',
      author: {
        '@type': 'Person',
        '@id': `${SITE}/#pessoa`,
        name: 'Luana da Silva Marinho',
        jobTitle: 'Advogada Criminalista',
        url: `${SITE}/`,
      },
      publisher: { '@id': `${SITE}/#advogada` },
      isPartOf: { '@id': `${SITE}/artigos/#blog` },
      breadcrumb: { '@id': `${SITE}${caminho}#breadcrumb` },
    },
    breadcrumbLd(caminho, [['Início', '/'], ['Artigos', '/artigos/'], [artigo.titulo, caminho]]),
    NO_ADVOGADA,
  ];

  const headExtra = `  <meta property="article:published_time" content="${esc(artigo.publicado_em)}">
  <meta property="article:modified_time" content="${esc(artigo.atualizado_em)}">
`;

  return respostaHtml(
    pagina({
      titulo,
      descricao: artigo.descricao,
      caminho,
      tipoOg: 'article',
      imagem,
      imagemAlt,
      headExtra,
      dados,
      corpo,
    })
  );
}

export const onRequestHead = onRequestGet;

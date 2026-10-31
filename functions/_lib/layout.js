/**
 * Moldura HTML das páginas de artigos — o mesmo <head>, menu, rodapé e botão
 * de WhatsApp das páginas estáticas, para que tudo pareça um site só.
 * Ao mudar o menu ou o rodapé das páginas .html, mude aqui também.
 */
export const SITE = 'https://luanamarinhoadvogada.com.br';

export const WHATSAPP =
  'https://wa.me/5511948475152?text=Ol%C3%A1,%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20servi%C3%A7os';

export const OG_PADRAO = `${SITE}/assets/img/og-image.jpg`;

/** Nó da advogada/escritório, repetido como nas páginas de atuação. */
export const NO_ADVOGADA = {
  '@type': ['Attorney', 'LegalService'],
  '@id': `${SITE}/#advogada`,
  name: 'Luana Marinho Advocacia Criminal',
  url: `${SITE}/`,
  telephone: '+55-11-94847-5152',
};

export const AREAS = [
  ['/prisao-em-flagrante/', 'Prisão em flagrante'],
  ['/audiencia-de-custodia/', 'Audiência de custódia'],
  ['/execucao-penal/', 'Execução penal'],
  ['/tribunal-do-juri/', 'Tribunal do júri'],
  ['/habeas-corpus/', 'Habeas corpus'],
];

export function esc(texto) {
  return String(texto ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/* "<" escapado impede que um texto com "</script>" feche a tag do JSON-LD. */
const jsonLd = (dados) => JSON.stringify(dados, null, 2).replace(/</g, '\\u003c');

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export const dataPorExtenso = (iso) => formatoData.format(new Date(iso));

export function breadcrumbLd(caminho, itens) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${SITE}${caminho}#breadcrumb`,
    itemListElement: itens.map(([nome, url], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: nome,
      item: `${SITE}${url}`,
    })),
  };
}

/* O _headers não vale para respostas de Functions — os cabeçalhos de
   segurança das páginas estáticas são repetidos aqui. */
const CABECALHOS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

export function respostaHtml(html, status = 200, extras = {}) {
  return new Response(html, { status, headers: { ...CABECALHOS, ...extras } });
}

/** Reaproveita o 404.html estático, mas com o status certo. */
export async function naoEncontrado(env, request) {
  const res = await env.ASSETS.fetch(new URL('/404', request.url));
  return respostaHtml(res.body, 404);
}

/**
 * Supabase fora do ar (ou projeto pausado). O 503 com Retry-After diz ao
 * Google que é temporário — ele volta depois em vez de tirar a página do índice.
 */
export function indisponivel() {
  const corpo = `
    <section class="page-hero band band-dark">
      <div class="wrap">
        <h1>Artigos temporariamente indisponíveis</h1>
        <p class="lead page-lead">Estamos com uma instabilidade momentânea. Tente de novo em alguns minutos — e, se o seu caso é urgente, fale agora mesmo com a advogada.</p>
        <div class="hero-actions">
          <a href="${WHATSAPP}" class="btn btn-primary" target="_blank" rel="noopener">Falar pelo WhatsApp</a>
          <a href="/" class="btn-link">Voltar ao início <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>`;
  const html = pagina({
    titulo: 'Artigos indisponíveis | Luana Marinho',
    descricao: 'Os artigos estão temporariamente indisponíveis.',
    caminho: '/artigos/',
    robots: 'noindex, follow',
    corpo,
  });
  return respostaHtml(html, 503, { 'Retry-After': '300', 'Cache-Control': 'no-store' });
}

export function bandaContato() {
  return `
    <section class="band band-dark band-divided" id="contato">
      <div class="wrap split">
        <div class="split-text reveal">
          <p class="sec-index">Contato</p>
          <h2>Conversa sigilosa sobre o seu caso</h2>
          <p class="sec-sub">
            Atendimento direto com a Dra. Luana Marinho — OAB/SP 497.409. Base em São Paulo, com atuação nacional.
          </p>
          <div class="hero-actions">
            <a href="${WHATSAPP}" class="btn btn-primary" target="_blank" rel="noopener">WhatsApp</a>
            <a href="mailto:luanamarinho.advogada@gmail.com" class="btn-link">Enviar e-mail <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </section>`;
}

/**
 * Página completa. `atual` marca o item "Artigos" do menu: 'page' na listagem,
 * 'true' dentro de um artigo (está na seção, mas não é a página do link).
 */
export function pagina({
  titulo,
  descricao,
  caminho,
  tipoOg = 'website',
  imagem = OG_PADRAO,
  imagemAlt = 'Luana Marinho — Advocacia Criminal',
  headExtra = '',
  dados,
  corpo,
  atual = 'true',
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
}) {
  const url = `${SITE}${caminho}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-MT299FHT');</script>

  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descricao)}">
  <meta name="author" content="Luana da Silva Marinho">
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#12141a">
  <meta name="geo.region" content="BR-SP">
  <meta name="geo.placename" content="São Paulo">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="pt-br" href="${url}">
  <link rel="alternate" hreflang="x-default" href="${url}">

  <meta property="og:type" content="${tipoOg}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Luana Marinho Advocacia Criminal">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(imagem)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${esc(imagemAlt)}">
${headExtra}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(titulo)}">
  <meta name="twitter:description" content="${esc(descricao)}">
  <meta name="twitter:image" content="${esc(imagem)}">
  <meta name="twitter:image:alt" content="${esc(imagemAlt)}">

  <link rel="icon" href="/assets/img/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Cinzel:wght@500;600;700&family=Jost:wght@300;400;500;600&display=swap"
    media="print" onload="this.media='all'">
  <noscript>
    <link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Cinzel:wght@500;600;700&family=Jost:wght@300;400;500;600&display=swap">
  </noscript>

  <link rel="stylesheet" href="/styles/style.css?v=8">
  <noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>
${dados ? `
  <script type="application/ld+json">
${jsonLd({ '@context': 'https://schema.org', '@graph': dados })}
  </script>` : ''}
</head>

<body>
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MT299FHT"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>

  <header>
    <nav class="navbar" aria-label="Navegação principal">
      <a href="/" class="logo" aria-label="Início — Luana Marinho Advocacia">
        <img src="/assets/img/icone-dourado.png" alt="" width="46" height="36" fetchpriority="high">
        <span class="logo-text">Luana Marinho<small>Advocacia Criminal</small></span>
      </a>

      <ul class="nav-links">
        <li><a href="/#inicio">Início</a></li>
        <li><a href="/#luana">A Advogada</a></li>
        <li><a href="/#areas">Atuação</a></li>
        <li><a href="/#duvidas">Dúvidas</a></li>
        <li><a href="/artigos/" aria-current="${atual}">Artigos</a></li>
        <li><a href="/#contato">Contato</a></li>
      </ul>

      <a class="nav-cta" href="${WHATSAPP}" target="_blank" rel="noopener">Agendar conversa</a>

      <button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </nav>
  </header>

  <main id="conteudo">${corpo}
  </main>

  <footer>
    <div class="footer-container">
      <div class="footer-section footer-brand">
        <img src="/assets/img/icone-dourado.png" alt="Luana Marinho Advocacia Criminal" width="60" height="46" loading="lazy">
        <p>Defesa criminal estratégica e humanizada, com atuação nacional.</p>
      </div>
      <div class="footer-section">
        <h3>Navegação</h3>
        <ul>
          <li><a href="/">Início</a></li>
          <li><a href="/#areas">Áreas de Atuação</a></li>
          <li><a href="/prisao-em-flagrante/">Prisão em Flagrante</a></li>
          <li><a href="/audiencia-de-custodia/">Audiência de Custódia</a></li>
          <li><a href="/execucao-penal/">Execução Penal</a></li>
          <li><a href="/tribunal-do-juri/">Tribunal do Júri</a></li>
          <li><a href="/habeas-corpus/">Habeas Corpus</a></li>
          <li><a href="/artigos/">Artigos</a></li>
          <li><a href="/#contato">Contato</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>Contato</h3>
        <p><a href="tel:+5511948475152">(11) 94847-5152</a></p>
        <p><a href="mailto:luanamarinho.advogada@gmail.com">luanamarinho.advogada@gmail.com</a></p>
        <p>São Paulo — SP · Atuação em todo o Brasil</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Luana Marinho · OAB/SP 497.409 | Todos os direitos reservados.</p>
    </div>
  </footer>

  <a class="wa-float" href="${WHATSAPP}" target="_blank" rel="noopener" aria-label="Conversar pelo WhatsApp">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </a>

  <script src="/scripts/main.js?v=5" defer></script>
</body>

</html>
`;
}

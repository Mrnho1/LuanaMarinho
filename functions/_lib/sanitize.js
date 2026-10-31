/**
 * Limpa o HTML que vem do editor antes de ir para a página pública.
 *
 * Só a Luana escreve, mas o conteúdo pode chegar colado do Word ou do Google
 * Docs, e uma conta comprometida não deve conseguir injetar script no site.
 * Usa o HTMLRewriter do Cloudflare (um parser de verdade, não regex) com uma
 * lista do que é permitido — todo o resto sai.
 */

const PERMITIDAS = new Set([
  'p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 's', 'a',
  'ul', 'ol', 'li', 'blockquote', 'img', 'figure', 'figcaption', 'hr',
]);

/* Removidas junto com tudo o que têm dentro. */
const PERIGOSAS = new Set([
  'script', 'style', 'iframe', 'frame', 'object', 'embed', 'form', 'input',
  'button', 'textarea', 'select', 'noscript', 'template', 'svg', 'math',
  'link', 'meta', 'base', 'title', 'head',
]);

/* O H1 da página é o título do artigo; um H1 colado no texto vira H2. */
const RENOMEAR = { h1: 'h2', h5: 'h4', h6: 'h4', b: 'strong', i: 'em', strike: 's', del: 's' };

const ATRIBUTOS = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'width', 'height']),
};

const PROTOCOLOS_LINK = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export async function sanitizarHtml(html, site) {
  const origemSite = new URL(site).origin;

  const rewriter = new HTMLRewriter()
    .on('*', {
      element(el) {
        let tag = el.tagName;
        if (PERIGOSAS.has(tag)) {
          el.remove();
          return;
        }
        if (RENOMEAR[tag]) {
          tag = RENOMEAR[tag];
          el.tagName = tag;
        }
        if (!PERMITIDAS.has(tag)) {
          el.removeAndKeepContent();
          return;
        }

        const permitidos = ATRIBUTOS[tag];
        for (const [nome] of [...el.attributes]) {
          if (!permitidos?.has(nome)) el.removeAttribute(nome);
        }

        if (tag === 'a') ajustarLink(el, origemSite);
        if (tag === 'img') ajustarImagem(el);
      },
    })
    .onDocument({
      comments(comentario) {
        comentario.remove();
      },
    });

  return rewriter.transform(new Response(html)).text();
}

function ajustarLink(el, origemSite) {
  const href = el.getAttribute('href');
  let url;
  try {
    url = new URL(href, origemSite);
  } catch {
    url = null;
  }
  if (!href || !url || !PROTOCOLOS_LINK.has(url.protocol)) {
    el.removeAttribute('href');
    return;
  }
  // Links para o próprio site abrem na mesma aba; os externos, em outra.
  if (url.origin !== origemSite && url.protocol.startsWith('http')) {
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  }
}

function ajustarImagem(el) {
  const src = el.getAttribute('src') || '';
  if (!src.startsWith('https://') && !src.startsWith('/')) {
    el.remove();
    return;
  }
  el.setAttribute('loading', 'lazy');
  el.setAttribute('decoding', 'async');
}

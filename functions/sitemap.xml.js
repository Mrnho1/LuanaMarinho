/**
 * /sitemap.xml — páginas fixas do site + todos os artigos publicados.
 * Um artigo novo entra aqui no mesmo instante em que é publicado.
 *
 * Ao criar uma página estática nova, inclua-a em PAGINAS.
 */
import { listarPublicados } from './_lib/supabase.js';
import { SITE, esc } from './_lib/layout.js';

const PAGINAS = [
  {
    caminho: '/',
    lastmod: '2026-10-31',
    priority: '1.0',
    imagens: [
      ['/assets/img/luana-marinho.jpg', 'Dra. Luana da Silva Marinho — advogada criminalista OAB/SP 497.409'],
      ['/assets/img/escritorio.jpg', 'Escritório de advocacia criminal Luana Marinho em São Paulo'],
    ],
  },
  { caminho: '/prisao-em-flagrante/', lastmod: '2026-10-31', priority: '0.8' },
  { caminho: '/audiencia-de-custodia/', lastmod: '2026-10-31', priority: '0.8' },
  { caminho: '/execucao-penal/', lastmod: '2026-10-31', priority: '0.8' },
  { caminho: '/tribunal-do-juri/', lastmod: '2026-10-31', priority: '0.8' },
  { caminho: '/habeas-corpus/', lastmod: '2026-10-31', priority: '0.8' },
];

const dia = (iso) => iso.slice(0, 10);

function url({ caminho, lastmod, changefreq = 'monthly', priority, imagens = [] }) {
  const tags = imagens
    .map(([src, titulo]) => `
    <image:image>
      <image:loc>${esc(src.startsWith('/') ? SITE + src : src)}</image:loc>
      <image:title>${esc(titulo)}</image:title>
    </image:image>`)
    .join('');
  return `
  <url>
    <loc>${SITE}${caminho}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${tags}
  </url>`;
}

export async function onRequestGet({ env }) {
  let artigos = [];
  let falhou = false;
  try {
    artigos = await listarPublicados(env, { limite: 1000 });
  } catch (erro) {
    // Sem o banco, o sitemap ainda sai com as páginas fixas.
    console.error(erro);
    falhou = true;
  }

  const ultimaEdicao = artigos.reduce((max, a) => (a.atualizado_em > max ? a.atualizado_em : max), '');

  const entradas = [
    ...PAGINAS,
    {
      caminho: '/artigos/',
      lastmod: ultimaEdicao ? dia(ultimaEdicao) : '2026-10-31',
      changefreq: 'weekly',
      priority: '0.7',
    },
    ...artigos.map((a) => ({
      caminho: `/artigos/${a.slug}/`,
      lastmod: dia(a.atualizado_em),
      priority: '0.6',
      imagens: a.imagem_capa ? [[a.imagem_capa, a.titulo]] : [],
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entradas.map(url).join('')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': falhou ? 'no-store' : 'public, max-age=3600',
    },
  });
}

export const onRequestHead = onRequestGet;

# Luana Marinho — Advocacia Criminal

Landing page estática (HTML/CSS/JS, sem framework) da Dra. Luana da Silva Marinho, advogada criminalista — OAB/SP 497.409.

**Produção:** https://luanamarinhoadvogada.com.br/

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:5173
```

## Imagens

As imagens em `assets/img/` são as versões **já otimizadas** que vão para produção.
Os arquivos em alta resolução ficam em `assets/_originals/` (fora do git).

```bash
npm run images   # regera JPEG/PNG comprimidos + .webp + og-image.jpg
```

Para trocar uma foto: coloque o arquivo em alta em `assets/_originals/` com o mesmo
nome do alvo em `scripts/optimize-images.mjs` e rode `npm run images`.
Se adicionar uma imagem nova, inclua-a no array `TARGETS` do script e lembre-se de
atualizar `width`/`height` no `<img>` correspondente — eles evitam _layout shift_ (CLS).

## Artigos (blog)

A Dra. Luana publica artigos em **`/admin/`** (login com e-mail e senha). Eles aparecem em
`/artigos/` e `/artigos/<endereço>/` no mesmo instante, já com SEO completo (title, description,
Open Graph, JSON-LD `BlogPosting`) e entram sozinhos no `/sitemap.xml`.

```
admin/                      painel: login, lista, editor (HTML + JS puro, sem build)
functions/artigos/          páginas públicas, montadas a cada acesso (Cloudflare Pages Functions)
functions/sitemap.xml.js    sitemap = páginas fixas + artigos publicados
functions/_lib/             moldura HTML compartilhada, consulta ao Supabase, limpeza do HTML
scripts/supabase-config.js  URL e chave PÚBLICA do Supabase (usada pelo painel e pelas functions)
supabase/schema.sql         tabelas, regras de acesso (RLS) e bucket de imagens
```

**Quem pode publicar:** só as contas listadas na tabela `public.admins`. O cadastro público fica
desligado no Supabase e as regras do banco recusam escrita de qualquer outra conta — a chave
pública no JavaScript não dá acesso de escrita. Rascunhos nunca saem do banco para visitantes.

**Rodar com os artigos localmente:** `npm run dev:pages` (http://localhost:8788) — usa o Supabase
de produção. O `npm run dev` continua servindo só as páginas estáticas.

**Ao mudar o menu ou o rodapé** das páginas `.html`, replique em `functions/_lib/layout.js`.
**Ao criar uma página estática nova**, inclua-a em `PAGINAS` no `functions/sitemap.xml.js`.

**Supabase pausado?** O plano gratuito pausa após 7 dias sem uso; o workflow
`.github/workflows/supabase-keepalive.yml` consulta o banco a cada 3 dias para evitar isso.
Como o repositório é público, o GitHub desliga workflows agendados após 60 dias sem commits —
se receber o e-mail de aviso, reative em **Actions → Manter Supabase ativo → Enable workflow**.
Se o projeto chegar a pausar, os artigos respondem 503 (o Google entende como temporário);
basta clicar em **Restore project** no painel do Supabase.

## Deploy — Cloudflare Pages

O deploy é contínuo: todo push na branch `main` publica automaticamente.

1. **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**
2. Selecione este repositório.
3. Configuração de build:
   - Framework preset: **None**
   - Build command: *(deixe vazio)*
   - Build output directory: **`/`**
4. **Custom domains** → adicione `luanamarinhoadvogada.com.br` e `www.luanamarinhoadvogada.com.br`.

O arquivo `_headers` na raiz aplica os cabeçalhos de segurança e a política de cache
(HTML revalidado a cada acesso, assets com cache de 1 ano).

A pasta `functions/` é detectada e publicada automaticamente pelo Pages — não há variável de
ambiente nem configuração extra. O `/admin/` é protegido também pelo **Cloudflare Access**
(Zero Trust → Access → Applications), que pede um código por e-mail antes da tela de login.

### Redirect de www → domínio raiz

Os dois hostnames servem o mesmo conteúdo, o que gera conteúdo duplicado.
Em **Rules → Redirect Rules**, crie:

- Se `hostname` igual a `www.luanamarinhoadvogada.com.br`
- Então redirecionar (301, preservando path e query) para `https://luanamarinhoadvogada.com.br`

## Checklist de SEO após publicar

- [ ] Desativar o GitHub Pages antigo (`mrnho1.github.io/LuanaMarinho`) para não competir no índice.
- [ ] Google Search Console: adicionar a propriedade de domínio e enviar `sitemap.xml`.
- [ ] Teste de Resultados Aprimorados do Google: validar `Attorney` e `FAQPage`.
- [ ] Criar/reivindicar o **Perfil da Empresa no Google** — é a maior fonte de contato
      para advocacia local, e a fonte de dados que o Google cruza com o `LegalService`
      do JSON-LD desta página.

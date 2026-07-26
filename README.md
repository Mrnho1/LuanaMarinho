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

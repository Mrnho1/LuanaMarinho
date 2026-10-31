-- =====================================================================
-- Artigos do site — estrutura do banco no Supabase
--
-- Rode este arquivo inteiro UMA vez no SQL Editor do projeto.
-- Depois de criar a conta da Luana em Authentication → Users, libere a
-- publicação para ela com:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'EMAIL_DA_LUANA';
-- =====================================================================


-- ---------- Quem pode publicar ----------
-- Ter conta no Supabase Auth não basta: só quem está nesta tabela escreve.
-- Ela não tem nenhuma policy, então não é lida nem alterada pela API — só
-- pelo SQL Editor do painel do Supabase.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- security definer: consulta a tabela acima mesmo sem policy de leitura.
create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;


-- ---------- Artigos ----------
create table public.artigos (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo        text not null check (length(trim(titulo)) > 0),
  titulo_seo    text,                       -- <title> próprio; vazio = "Título | Luana Marinho"
  descricao     text not null default '',   -- meta description
  palavra_chave text,                       -- só orienta o checklist de SEO do painel
  conteudo      text not null default '',   -- HTML gerado pelo editor
  imagem_capa   text,
  imagem_alt    text,
  publicado     boolean not null default false,
  publicado_em  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index artigos_publicados_idx on public.artigos (publicado_em desc) where publicado;

create function public.artigos_carimbar_datas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  -- A data de publicação é fixada na primeira vez que o artigo vai ao ar e
  -- não muda em edições posteriores, nem se ele for despublicado e voltar.
  if new.publicado and new.publicado_em is null then
    new.publicado_em := now();
  end if;
  return new;
end;
$$;

create trigger artigos_carimbar_datas
  before insert or update on public.artigos
  for each row execute function public.artigos_carimbar_datas();

alter table public.artigos enable row level security;

grant select on public.artigos to anon;
grant select, insert, update, delete on public.artigos to authenticated;

-- Visitantes (e o site) só enxergam o que está publicado; rascunhos ficam ocultos.
create policy "leitura pública dos publicados"
  on public.artigos for select to anon, authenticated
  using (publicado);

create policy "admin lê tudo, inclusive rascunhos"
  on public.artigos for select to authenticated
  using ((select public.eh_admin()));

create policy "admin cria"
  on public.artigos for insert to authenticated
  with check ((select public.eh_admin()));

create policy "admin edita"
  on public.artigos for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

create policy "admin exclui"
  on public.artigos for delete to authenticated
  using ((select public.eh_admin()));


-- ---------- Imagens (capa e corpo dos artigos) ----------
-- Bucket público: qualquer pessoa vê as imagens pelo link, só a admin envia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artigos', 'artigos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin envia imagens"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'artigos' and (select public.eh_admin()));

-- O upload faz um INSERT ... RETURNING, que também passa pela policy de leitura.
create policy "admin lê imagens"
  on storage.objects for select to authenticated
  using (bucket_id = 'artigos' and (select public.eh_admin()));

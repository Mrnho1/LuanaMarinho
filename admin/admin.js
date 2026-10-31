/**
 * Painel de artigos — login, lista e editor.
 *
 * Este arquivo é público. A segurança está no banco (supabase/schema.sql):
 * o painel só conversa com o Supabase usando a sessão de quem fez login, e
 * o banco recusa qualquer escrita de quem não está na tabela de admins.
 */
import { SUPABASE_URL, SUPABASE_KEY } from '/scripts/supabase-config.js?v=1';

const BUCKET = 'artigos';
const SITE = 'luanamarinhoadvogada.com.br';
const $ = (seletor) => document.querySelector(seletor);

/* O link do e-mail de "esqueci minha senha" volta com #...type=recovery.
   Precisa ser lido antes de criar o cliente, que consome esse trecho. */
let pedindoNovaSenha = /type=recovery/.test(location.hash);

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===================== UTILITÁRIOS ===================== */

const TELAS = ['carregando', 'login', 'senha', 'lista', 'editor'];

function mostrar(nome) {
  for (const tela of TELAS) $(`#tela-${tela}`).hidden = tela !== nome;
  window.scrollTo(0, 0);
}

let avisoTimer;
function avisar(texto, tipo = 'info') {
  const el = $('#aviso');
  clearTimeout(avisoTimer);
  el.textContent = texto || '';
  el.dataset.tipo = tipo;
  el.hidden = !texto;
  // Reinicia a animação de entrada: a mesma mensagem repetida (ex.: senha
  // errada duas vezes) precisa parecer nova, senão não se nota a segunda.
  el.classList.remove('adm-aviso-novo');
  void el.offsetWidth;
  el.classList.add('adm-aviso-novo');
  if (texto && tipo === 'ok') avisoTimer = setTimeout(() => (el.hidden = true), 5000);
}

function traduzirErro(erro) {
  const msg = String(erro?.message || erro || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado.';
  if (erro?.status === 429 || msg.includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (msg.includes('should be different')) return 'A nova senha precisa ser diferente da atual.';
  if (msg.includes('password should be')) return 'A senha é fraca ou curta demais.';
  if (erro?.code === '23505') return 'Já existe outro artigo com este endereço. Mude o campo “Endereço do artigo”.';
  if (msg.includes('exceeded the maximum')) return 'A imagem é grande demais (máximo de 5 MB).';
  if (msg.includes('jwt expired')) return 'Sua sessão expirou. Entre novamente.';
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  return `Algo deu errado: ${erro?.message || erro}`;
}

const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function slugify(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
}

const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const data = (iso) => formatoData.format(new Date(iso));
const dataHora = (iso) => `${data(iso)} às ${formatoHora.format(new Date(iso))}`;

/* Botão "Mostrar" ao lado de cada campo de senha. */
for (const campo of document.querySelectorAll('input[type="password"]')) {
  const caixa = document.createElement('span');
  caixa.className = 'adm-senha';
  campo.replaceWith(caixa);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'adm-senha-ver';
  botao.textContent = 'Mostrar';
  botao.setAttribute('aria-label', 'Mostrar senha');
  botao.addEventListener('click', () => {
    const oculta = campo.type === 'password';
    campo.type = oculta ? 'text' : 'password';
    botao.textContent = oculta ? 'Ocultar' : 'Mostrar';
    botao.setAttribute('aria-label', oculta ? 'Ocultar senha' : 'Mostrar senha');
    campo.focus();
  });
  caixa.append(campo, botao);
  // Ao enviar ou limpar o formulário, a senha volta a ficar oculta.
  campo.form?.addEventListener('reset', () => {
    campo.type = 'password';
    botao.textContent = 'Mostrar';
    botao.setAttribute('aria-label', 'Mostrar senha');
  });
}

/* ===================== LOGIN E SESSÃO ===================== */

sb.auth.onAuthStateChange((evento) => {
  // O supabase-js pede que o callback não chame o próprio cliente na hora;
  // o setTimeout adia o trabalho para depois do evento.
  if (evento === 'PASSWORD_RECOVERY') {
    pedindoNovaSenha = true;
    setTimeout(() => mostrar('senha'), 0);
  }
  if (evento === 'SIGNED_OUT') {
    setTimeout(() => {
      $('#usuario').hidden = true;
      mostrar('login');
    }, 0);
  }
});

/** Confere no banco se a conta pode publicar. Se não puder, encerra a sessão. */
async function entrar(usuario) {
  const { data: ehAdmin, error } = await sb.rpc('eh_admin');
  if (error || !ehAdmin) {
    await sb.auth.signOut();
    avisar(error ? traduzirErro(error) : 'Esta conta não tem permissão para publicar artigos.', 'erro');
    return false;
  }
  $('#usuario-email').textContent = usuario.email;
  $('#usuario').hidden = false;
  return true;
}

async function iniciar() {
  if (SUPABASE_URL.includes('SEU-PROJETO')) {
    mostrar('login');
    avisar('O painel ainda não está ligado ao Supabase: preencha scripts/supabase-config.js.', 'erro');
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return mostrar('login');
  if (!(await entrar(session.user))) return;
  if (pedindoNovaSenha) mostrar('senha');
  else abrirLista();
}

$('#form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.currentTarget;
  const email = form.email.value.trim();
  if (!email || !form.senha.value) return avisar('Preencha o e-mail e a senha.', 'erro');

  const botao = form.querySelector('[type=submit]');
  botao.disabled = true;
  botao.textContent = 'Entrando…';
  avisar('');
  const { data: resposta, error } = await sb.auth.signInWithPassword({ email, password: form.senha.value });
  botao.disabled = false;
  botao.textContent = 'Entrar';
  if (error) return avisar(traduzirErro(error), 'erro');

  form.reset();
  if (await entrar(resposta.user)) abrirLista();
});

$('#esqueci').addEventListener('click', async () => {
  const email = $('#form-login').email.value.trim();
  if (!email) return avisar('Digite seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.', 'erro');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/` });
  if (error) return avisar(traduzirErro(error), 'erro');
  avisar('Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.', 'ok');
});

$('#form-senha').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.currentTarget;
  if (form.senha.value.length < 8) return avisar('A senha precisa ter pelo menos 8 caracteres.', 'erro');
  if (form.senha.value !== form.confirmacao.value) return avisar('As duas senhas não estão iguais.', 'erro');

  const botao = form.querySelector('[type=submit]');
  botao.disabled = true;
  const { error } = await sb.auth.updateUser({ password: form.senha.value });
  botao.disabled = false;
  if (error) return avisar(traduzirErro(error), 'erro');

  form.reset();
  pedindoNovaSenha = false;
  history.replaceState(null, '', location.pathname);
  avisar('Senha alterada.', 'ok');
  abrirLista();
});

$('#cancelar-senha').addEventListener('click', () => {
  pedindoNovaSenha = false;
  $('#form-senha').reset();
  abrirLista();
});

$('#trocar-senha').addEventListener('click', () => {
  if (podeSairDoEditor()) mostrar('senha');
});

$('#sair').addEventListener('click', async () => {
  if (!podeSairDoEditor()) return;
  await sb.auth.signOut();
  avisar('');
});

/* ===================== LISTA ===================== */

async function abrirLista() {
  mostrar('lista');
  const lista = $('#lista');
  lista.innerHTML = '<li class="adm-vazio">Carregando…</li>';

  const { data: artigos, error } = await sb
    .from('artigos')
    .select('id, slug, titulo, publicado, publicado_em, atualizado_em')
    .order('atualizado_em', { ascending: false });

  if (error) {
    lista.innerHTML = '';
    return avisar(traduzirErro(error), 'erro');
  }
  if (!artigos.length) {
    lista.innerHTML = '<li class="adm-vazio">Nenhum artigo ainda. Clique em “Novo artigo” para escrever o primeiro.</li>';
    return;
  }
  lista.replaceChildren(...artigos.map(itemDaLista));
}

function itemDaLista(artigo) {
  const li = document.createElement('li');
  li.className = 'adm-item';
  li.innerHTML = `
    <div>
      <span class="adm-selo"></span>
      <h2></h2>
      <p class="adm-data"></p>
    </div>
    <div class="adm-item-acoes">
      <a class="adm-link" target="_blank" rel="noopener" hidden>Ver no site ↗</a>
      <button type="button" class="btn btn-primary adm-btn-pequeno">Editar</button>
    </div>`;
  // textContent em vez de innerHTML: o título nunca é interpretado como HTML.
  const selo = li.querySelector('.adm-selo');
  selo.textContent = artigo.publicado ? 'Publicado' : 'Rascunho';
  selo.dataset.publicado = artigo.publicado;
  li.querySelector('h2').textContent = artigo.titulo;
  li.querySelector('.adm-data').textContent = artigo.publicado
    ? `Publicado em ${data(artigo.publicado_em)} · editado em ${dataHora(artigo.atualizado_em)}`
    : `Editado em ${dataHora(artigo.atualizado_em)}`;
  if (artigo.publicado) {
    const ver = li.querySelector('a');
    ver.href = `/artigos/${artigo.slug}/`;
    ver.hidden = false;
  }
  li.querySelector('button').addEventListener('click', () => abrirEditor(artigo.id));
  return li;
}

$('#novo').addEventListener('click', () => abrirEditor(null));

/* ===================== EDITOR ===================== */

let quill;
let artigo = null; // linha do banco; null = artigo novo ainda não salvo
let capaUrl = null;
let slugManual = false;
let alterado = false;

/* Link digitado sem "https://" (ex.: www.planalto.gov.br) viraria um
   endereço relativo, quebrado. Completa o protocolo antes de gravar. */
const Link = Quill.import('formats/link');
class LinkComProtocolo extends Link {
  static sanitize(url) {
    const limpo = url.trim();
    return super.sanitize(/^(https?:|mailto:|tel:|\/|#)/i.test(limpo) ? limpo : `https://${limpo}`);
  }
}
Quill.register(LinkComProtocolo, true);

function criarEditor() {
  if (quill) return;
  quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Escreva o artigo aqui. Use “Título” para dividir o texto em seções.',
    formats: ['header', 'bold', 'italic', 'underline', 'link', 'list', 'blockquote', 'image'],
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'link', 'image'],
          ['clean'],
        ],
        handlers: { image: inserirImagem },
      },
    },
  });

  const nomes = {
    '.ql-header': 'Tipo de texto',
    '.ql-bold': 'Negrito',
    '.ql-italic': 'Itálico',
    '.ql-underline': 'Sublinhado',
    '.ql-list[value="ordered"]': 'Lista numerada',
    '.ql-list[value="bullet"]': 'Lista com marcadores',
    '.ql-blockquote': 'Citação',
    '.ql-link': 'Inserir link',
    '.ql-image': 'Inserir imagem',
    '.ql-clean': 'Limpar formatação',
  };
  for (const [seletor, nome] of Object.entries(nomes)) {
    for (const el of document.querySelectorAll(`.ql-toolbar ${seletor}`)) {
      el.title = nome;
      el.setAttribute('aria-label', nome);
    }
  }
  document.querySelector('.ql-tooltip input').dataset.link = `https://${SITE}/habeas-corpus/`;

  quill.on('text-change', (_delta, _antes, origem) => {
    if (origem === 'user') marcarAlterado();
    atualizarSeo();
  });
}

/** HTML do editor, pronto para gravar. */
function htmlDoEditor() {
  if (!quill.getText().trim() && !quill.root.querySelector('img')) return '';
  return (
    quill
      .getSemanticHTML()
      // O Quill 2.0.3 exporta todo espaço como &nbsp;, o que impede o texto
      // de quebrar linha normalmente no site.
      .replace(/&nbsp;| /g, ' ')
      // Linhas em branco (Enter duas vezes) — o site já espaça os parágrafos.
      .replace(/<p>(?:\s|<br\s*\/?>)*<\/p>/g, '')
  );
}

async function abrirEditor(id) {
  criarEditor();

  let dados = {
    titulo: '', slug: '', descricao: '', titulo_seo: '', palavra_chave: '',
    conteudo: '', imagem_capa: null, imagem_alt: '', publicado: false,
  };
  if (id) {
    const { data: linha, error } = await sb.from('artigos').select('*').eq('id', id).single();
    if (error) return avisar(traduzirErro(error), 'erro');
    dados = linha;
  }

  artigo = id ? dados : null;
  capaUrl = dados.imagem_capa;
  // Artigo já salvo: o endereço não acompanha mais as mudanças do título.
  slugManual = Boolean(id);

  $('#titulo').value = dados.titulo;
  $('#slug').value = dados.slug;
  $('#descricao').value = dados.descricao || '';
  $('#titulo-seo').value = dados.titulo_seo || '';
  $('#palavra-chave').value = dados.palavra_chave || '';
  $('#capa-alt').value = dados.imagem_alt || '';
  quill.setContents(quill.clipboard.convert({ html: dados.conteudo || '' }), 'silent');
  quill.history.clear();
  alterado = false;

  mostrar('editor');
  ajustarAlturaTitulo();
  atualizarCapa();
  atualizarEstado();
  atualizarSeo();
  if (!id) $('#titulo').focus();
}

function marcarAlterado() {
  alterado = true;
  atualizarEstado();
}

function podeSairDoEditor() {
  if ($('#tela-editor').hidden || !alterado) return true;
  if (!confirm('Há alterações não salvas neste artigo. Sair mesmo assim?')) return false;
  alterado = false;
  return true;
}

window.addEventListener('beforeunload', (evento) => {
  if (alterado) evento.preventDefault();
});

function atualizarEstado() {
  const publicado = Boolean(artigo?.publicado);
  $('#publicar').textContent = publicado ? 'Salvar alterações' : 'Publicar';
  $('#salvar').hidden = publicado;
  $('#despublicar').hidden = !publicado;
  $('#excluir').hidden = !artigo;
  $('#slug-aviso').hidden = !publicado;
  const ver = $('#ver');
  ver.hidden = !publicado;
  if (publicado) ver.href = `/artigos/${artigo.slug}/`;

  let texto = !artigo
    ? 'Novo artigo, ainda não salvo'
    : publicado
      ? `Publicado em ${data(artigo.publicado_em)}`
      : `Rascunho salvo em ${dataHora(artigo.atualizado_em)}`;
  if (alterado && artigo) texto += ' · alterações não salvas';
  $('#status').textContent = texto;
  $('#status').dataset.alterado = alterado;
}

async function salvar(publicar, mensagem) {
  const titulo = $('#titulo').value.trim();
  const slug = slugify($('#slug').value || titulo);
  const descricao = $('#descricao').value.trim();
  const conteudo = htmlDoEditor();

  if (!titulo) return avisar('Dê um título ao artigo antes de salvar.', 'erro');
  if (!slug) return avisar('Preencha o endereço do artigo.', 'erro');
  if (publicar && !conteudo) return avisar('O artigo está sem texto.', 'erro');
  if (publicar && !descricao) return avisar('Escreva a descrição antes de publicar: é o texto que aparece no Google.', 'erro');
  if (artigo?.publicado && slug !== artigo.slug &&
      !confirm('Mudar o endereço de um artigo publicado quebra os links que já apontam para ele. Continuar?')) return;

  $('#slug').value = slug;
  const dados = {
    titulo,
    slug,
    descricao,
    conteudo,
    titulo_seo: $('#titulo-seo').value.trim() || null,
    palavra_chave: $('#palavra-chave').value.trim() || null,
    imagem_capa: capaUrl,
    imagem_alt: $('#capa-alt').value.trim() || null,
    publicado: publicar,
  };

  const botoes = document.querySelectorAll('.adm-acoes button');
  botoes.forEach((b) => (b.disabled = true));
  const consulta = artigo
    ? sb.from('artigos').update(dados).eq('id', artigo.id)
    : sb.from('artigos').insert(dados);
  const { data: salvo, error } = await consulta.select().single();
  botoes.forEach((b) => (b.disabled = false));
  if (error) return avisar(traduzirErro(error), 'erro');

  const jaEstavaNoAr = Boolean(artigo?.publicado);
  artigo = salvo;
  slugManual = true;
  alterado = false;
  atualizarEstado();
  avisar(
    mensagem ??
      (!publicar
        ? 'Rascunho salvo. Ele não aparece no site.'
        : jaEstavaNoAr
          ? 'Alterações publicadas no site.'
          : 'Artigo publicado! Ele já está no site.'),
    'ok'
  );
}

$('#publicar').addEventListener('click', () => salvar(true));
$('#salvar').addEventListener('click', () => salvar(false));

$('#despublicar').addEventListener('click', () => {
  if (!confirm('Tirar este artigo do site? Ele volta a ser rascunho e pode ser publicado de novo depois.')) return;
  salvar(false, 'O artigo saiu do site e voltou a ser rascunho.');
});

$('#excluir').addEventListener('click', async () => {
  if (!confirm(`Excluir definitivamente o artigo “${artigo.titulo}”? Isso não pode ser desfeito.`)) return;
  const { error } = await sb.from('artigos').delete().eq('id', artigo.id);
  if (error) return avisar(traduzirErro(error), 'erro');
  alterado = false;
  avisar('Artigo excluído.', 'ok');
  abrirLista();
});

$('#voltar').addEventListener('click', () => {
  if (podeSairDoEditor()) abrirLista();
});

function ajustarAlturaTitulo() {
  const campo = $('#titulo');
  campo.style.height = 'auto';
  campo.style.height = `${campo.scrollHeight}px`;
}

$('#titulo').addEventListener('input', () => {
  ajustarAlturaTitulo();
  if (!slugManual) $('#slug').value = slugify($('#titulo').value);
  marcarAlterado();
  atualizarSeo();
});

// Enter no título leva para o texto, em vez de quebrar a linha do título.
$('#titulo').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    evento.preventDefault();
    quill.focus();
  }
});

$('#slug').addEventListener('input', () => {
  // Apagar o campo devolve o endereço automático, gerado pelo título.
  slugManual = $('#slug').value.trim() !== '';
  marcarAlterado();
  atualizarSeo();
});

$('#slug').addEventListener('blur', () => {
  $('#slug').value = slugify($('#slug').value || $('#titulo').value);
  atualizarSeo();
});

for (const seletor of ['#descricao', '#titulo-seo', '#palavra-chave', '#capa-alt']) {
  $(seletor).addEventListener('input', () => {
    marcarAlterado();
    atualizarSeo();
  });
}

/* ===================== IMAGENS ===================== */

/**
 * Redimensiona no navegador antes de enviar: a foto do celular (4 MB, 4000px)
 * chega ao site com ~150 KB. Com `altura`, recorta do centro nessa proporção.
 */
async function prepararImagem(arquivo, { largura, altura }) {
  const bitmap = await createImageBitmap(arquivo);
  let [sx, sy, sw, sh] = [0, 0, bitmap.width, bitmap.height];
  let w, h;
  if (altura) {
    const proporcao = largura / altura;
    if (sw / sh > proporcao) {
      sw = sh * proporcao;
      sx = (bitmap.width - sw) / 2;
    } else {
      sh = sw / proporcao;
      sy = (bitmap.height - sh) / 2;
    }
    [w, h] = [largura, altura];
  } else {
    const escala = Math.min(1, largura / sw);
    [w, h] = [Math.round(sw * escala), Math.round(sh * escala)];
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // fundo para PNG transparente, que o JPEG não tem
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82));
}

async function enviarImagem(arquivo, pasta, medidas) {
  if (!arquivo.type.startsWith('image/')) throw new Error('O arquivo escolhido não é uma imagem.');
  const blob = await prepararImagem(arquivo, medidas);
  // Nome descritivo (ex.: capas/prisao-em-flagrante-m3k9x2.jpg) ajuda um pouco no Google Imagens.
  const nome = slugify($('#slug').value || $('#titulo').value) || 'artigo';
  const caminho = `${pasta}/${nome}-${Date.now().toString(36)}.jpg`;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

function atualizarCapa() {
  const previa = $('#capa-previa');
  previa.hidden = !capaUrl;
  if (capaUrl) previa.src = capaUrl;
  else previa.removeAttribute('src');
  $('#capa-rotulo').textContent = capaUrl ? 'Trocar imagem' : 'Escolher imagem';
  $('#capa-remover').hidden = !capaUrl;
}

$('#capa-arquivo').addEventListener('change', async (evento) => {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  try {
    avisar('Enviando imagem…');
    capaUrl = await enviarImagem(arquivo, 'capas', { largura: 1200, altura: 630 });
    atualizarCapa();
    marcarAlterado();
    atualizarSeo();
    avisar('Capa enviada. Salve o artigo para manter a alteração.', 'ok');
  } catch (erro) {
    avisar(traduzirErro(erro), 'erro');
  } finally {
    evento.target.value = '';
  }
});

$('#capa-remover').addEventListener('click', () => {
  capaUrl = null;
  atualizarCapa();
  marcarAlterado();
  atualizarSeo();
});

/* Botão de imagem do editor: envia para o Storage em vez de embutir a imagem
   no texto (o padrão do Quill, que deixaria o artigo com megabytes). */
function inserirImagem() {
  const seletor = document.createElement('input');
  seletor.type = 'file';
  seletor.accept = 'image/*';
  seletor.addEventListener('change', async () => {
    const arquivo = seletor.files[0];
    if (!arquivo) return;
    const posicao = (quill.getSelection(true) || { index: quill.getLength() }).index;
    try {
      avisar('Enviando imagem…');
      const url = await enviarImagem(arquivo, 'conteudo', { largura: 1200 });
      const alt = (prompt('Descreva a imagem em poucas palavras (ajuda o Google e quem usa leitor de tela):') || '').trim();
      quill.insertEmbed(posicao, 'image', url, 'user');
      if (alt) quill.formatText(posicao, 1, 'alt', alt, 'user');
      quill.setSelection(posicao + 1, 0);
      avisar('');
    } catch (erro) {
      avisar(traduzirErro(erro), 'erro');
    }
  });
  seletor.click();
}

/* ===================== SEO ===================== */

function contador(seletor, tamanho, minimo, maximo) {
  const el = $(seletor);
  el.textContent = `${tamanho} caracteres`;
  el.dataset.estado = tamanho === 0 ? '' : tamanho >= minimo && tamanho <= maximo ? 'ok' : 'fora';
}

function temLinkInterno() {
  return [...quill.root.querySelectorAll('a[href]')].some((a) => {
    try {
      return new URL(a.getAttribute('href'), `https://${SITE}`).hostname.endsWith(SITE);
    } catch {
      return false;
    }
  });
}

function atualizarSeo() {
  if (!quill) return;
  const titulo = $('#titulo').value.trim();
  const tituloGoogle = $('#titulo-seo').value.trim() || (titulo ? `${titulo} | Luana Marinho` : '');
  const descricao = $('#descricao').value.trim();
  const slug = $('#slug').value.trim();

  contador('#descricao-contador', descricao.length, 120, 160);
  contador('#titulo-seo-contador', tituloGoogle.length, 1, 60);
  $('#previa-url').textContent = `${SITE} › artigos › ${slug || '…'}`;
  $('#previa-titulo').textContent = tituloGoogle || 'Título do artigo';
  $('#previa-descricao').textContent = descricao || 'A descrição aparece aqui, do jeito que o Google mostra.';

  const chave = normalizar($('#palavra-chave').value);
  const texto = quill.getText();
  const palavras = (texto.match(/\S+/g) || []).length;
  const primeiroParagrafo = normalizar(texto.split('\n').find((linha) => linha.trim()) || '');

  const itens = [
    [chave && normalizar(titulo).includes(chave), 'Palavra-chave no título'],
    [chave && normalizar(descricao).includes(chave), 'Palavra-chave na descrição'],
    [chave && slug.includes(slugify(chave)), 'Palavra-chave no endereço'],
    [chave && primeiroParagrafo.includes(chave), 'Palavra-chave no primeiro parágrafo'],
    [descricao.length >= 120 && descricao.length <= 160, 'Descrição entre 120 e 160 caracteres'],
    [tituloGoogle.length > 0 && tituloGoogle.length <= 60, 'Título no Google com até 60 caracteres'],
    [palavras >= 600, `Texto com 600 palavras ou mais (agora: ${palavras})`],
    [Boolean(quill.root.querySelector('h2')), 'Texto dividido em seções com “Título”'],
    [temLinkInterno(), 'Link para uma página do site (ex.: Habeas corpus)'],
    [Boolean(capaUrl && $('#capa-alt').value.trim()), 'Imagem de capa com descrição'],
  ];

  $('#checklist').replaceChildren(
    ...itens.map(([ok, rotulo]) => {
      const li = document.createElement('li');
      li.textContent = rotulo;
      li.dataset.ok = Boolean(ok);
      return li;
    })
  );
}

iniciar();

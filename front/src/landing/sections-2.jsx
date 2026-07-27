import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Icon from './icons.jsx'
import { CENPROD_DATA } from './data.js'
import { landingPath, DASHBOARD_URL } from './paths.js'
import logo from '../assets/logo.png'
import { Placeholder, PageHero } from './sections-1.jsx'

// ── CATÁLOGO (parte interna de la página de Productos) ───────────────────────
function Catalogo({ filterCat, onClearFilter, onAdd, cartIds }) {
  const all = CENPROD_DATA.productos;
  const cats = CENPROD_DATA.categorias;
  const [active, setActive] = useState(filterCat || 'todos');
  useEffect(() => { if (filterCat) setActive(filterCat); }, [filterCat]);

  const items = useMemo(() => {
    return all.filter(p => active === 'todos' || p.categoria === active);
  }, [active, all]);

  return (
    <div className="cat-section">
      <div className="filters-bar">
        <div className="filters">
          <span className="filters__lbl">Tipo:</span>
          <button className={`fil ${active==='todos'?'is-on':''}`} onClick={() => { setActive('todos'); onClearFilter?.(); }}>Todos</button>
          {cats.map(c => (
            <button key={c.id} className={`fil ${active===c.id?'is-on':''}`} onClick={() => setActive(c.id)}>
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
      <div className="catalog-meta">
        <span>{items.length} programa{items.length===1?'':'s'} encontrado{items.length===1?'':'s'}</span>
        <span className="catalog-meta__sort">Ordenar: <strong>Más relevantes</strong></span>
      </div>
      <div className="prod-grid">
        {items.length === 0 ? (
          <div className="prod-empty">
            <Icon name="search" size={28} stroke="#1B5670" />
            <p>No hay programas en esa categoría. Prueba con otro tipo.</p>
          </div>
        ) : items.map((p, i) => (
          <ProductCard key={p.id} p={p} onAdd={onAdd} inCart={cartIds.has(p.id)} idx={i} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ p, onAdd, inCart, idx }) {
  const cat = CENPROD_DATA.categorias.find(c => c.id === p.categoria);
  const desc = p.precioAntes ? Math.round((1 - p.precio / p.precioAntes) * 100) : 0;
  const isFree = p.precio === 0;
  return (
    <article className={`prod ${p.destacado?'prod--hot':''}`} style={{ animationDelay: `${Math.min(idx, 10)*55}ms` }}>
      <div className="prod__media">
        <Placeholder src={p.img} label={`foto · ${cat.nombre.toLowerCase()}`} ratio="16/10" tone={p.destacado?'teal':'cream'} alt={p.titulo} />
        {p.tag ? <span className={`prod__tag prod__tag--${p.tag.toLowerCase().replace(/\s/g,'-')}`}>{p.tag}</span> : null}
        {desc>0 ? <span className="prod__disc">-{desc}%</span> : null}
      </div>
      <div className="prod__body">
        <div className="prod__chips">
          <span className="prod__cat"><Icon name={cat.icon} size={13} stroke="#1B5670" /> {cat.nombre}</span>
        </div>
        <h3 className="prod__title">{p.titulo}</h3>
        <p className="prod__detalle">{p.detalle}</p>
        <ul className="prod__meta">
          <li><Icon name="clock" size={14} /> {p.duracion}</li>
          <li><Icon name="book" size={14} /> {p.modulos} {p.modulos===1?'sesión':'módulos'}</li>
          <li><Icon name="users" size={14} /> {p.cupos}</li>
        </ul>
      </div>
      <div className="prod__foot">
        <div className="prod__price">
          {p.precioAntes ? <s>S/ {p.precioAntes}</s> : null}
          <strong>{isFree ? 'Gratis' : `S/ ${p.precio}`}</strong>
        </div>
        <button className={`btn btn--sm ${inCart?'btn--added':'btn--primary'}`} onClick={() => onAdd(p)} disabled={inCart}>
          {inCart ? (<><Icon name="check" size={16} /> Añadido</>) : (<><Icon name="plus" size={16} /> {isFree ? 'Inscribirme' : 'Al carrito'}</>)}
        </button>
      </div>
    </article>
  );
}

// ── PÁGINA: PRODUCTOS ─────────────────────────────────────────────────────────
function ProductosPage({ filterCat, onClearFilter, onAdd, cartIds }) {
  return (
    <article className="page page--productos" data-screen-label="Productos">
      <PageHero
        compact
        eyebrow="Catálogo de cursos"
        title={['Todos nuestros', <span key="em" style={{fontStyle:'normal'}}><em>cursos y programas.</em></span>]}
        sub="Filtra por tipo de concurso, añade al carrito y paga en cuotas."
      />
      <Catalogo filterCat={filterCat} onClearFilter={onClearFilter} onAdd={onAdd} cartIds={cartIds} />
    </article>
  );
}

// ── PÁGINA: VERIFICAR CERTIFICADO ─────────────────────────────────────────────
function VerificarPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    setErr(''); setResult(null);
    const c = code.trim().toUpperCase();
    if (!c) { setErr('Ingresa el código del certificado.'); return; }
    const found = CENPROD_DATA.certificadosDemo.find(r => r.codigo.toUpperCase() === c);
    if (found) setResult(found);
    else setErr(`No encontramos el certificado "${c}". Prueba con CPD-2025-04812 o CPD-2024-02199.`);
  };
  return (
    <article className="page page--verify" data-screen-label="Verificar certificado">
      <PageHero
        eyebrow="Verificación de certificados"
        title={['¿Tu certificado', <span key="em"><em>es auténtico?</em></span>]}
        sub="Todo certificado CENPROD lleva un código único. Aquí puedes validar nombre, horas pedagógicas y fecha."
      />
      <div className="verify">
        <div className="verify__panel">
          <div className="verify__left">
            <span className="eyebrow eyebrow--on-teal"><span className="dot dot--green" /> Verificación oficial</span>
            <h2 className="sec__title sec__title--light sec__title--sm">Ingresa el código<br/>para validar.</h2>
            <p className="verify__sub">
              El código aparece impreso en la esquina inferior del certificado y comienza con <strong>CPD-</strong>.
            </p>
            <form className="verify__form" onSubmit={submit}>
              <div className="verify__input">
                <Icon name="seal" size={18} stroke="#2DB94B" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej. CPD-2025-04812"
                  aria-label="Código de certificado"
                />
              </div>
              <button className="btn btn--green" type="submit">
                Verificar <Icon name="arrow-right" size={16} />
              </button>
            </form>
            <small className="verify__hint">Prueba con <kbd>CPD-2025-04812</kbd> o <kbd>CPD-2024-02199</kbd></small>
          </div>
          <div className="verify__right">
            {!result && !err && (
              <div className="verify__empty">
                <Icon name="search" size={32} stroke="rgba(255,255,255,.4)" />
                <p>El resultado aparecerá aquí.</p>
              </div>
            )}
            {err && (
              <div className="verify__err">
                <Icon name="x" size={20} stroke="#FF8A6B" />
                <p>{err}</p>
              </div>
            )}
            {result && (
              <div className="verify__ok">
                <div className="verify__ok-head">
                  <Icon name="check-circle" size={28} stroke="#2DB94B" />
                  <div>
                    <strong>Certificado verificado</strong>
                    <span>{result.estado}</span>
                  </div>
                </div>
                <dl className="verify__dl">
                  <div><dt>Docente</dt><dd>{result.nombre}</dd></div>
                  <div><dt>Programa</dt><dd>{result.curso}</dd></div>
                  <div><dt>Horas pedagógicas</dt><dd>{result.horas} hrs</dd></div>
                  <div><dt>Fecha de emisión</dt><dd>{result.emision}</dd></div>
                  <div><dt>Código</dt><dd className="mono">{result.codigo}</dd></div>
                </dl>
                <button className="btn btn--sm btn--ghost-light"><Icon name="download" size={14} /> Descargar PDF</button>
              </div>
            )}
          </div>
        </div>

        <div className="verify-help">
          <div className="vh-card">
            <div className="vh-card__ic"><Icon name="shield" size={22} stroke="#1B5670" /></div>
            <h4>Código único e irrepetible</h4>
            <p>Cada certificado tiene un código encriptado que no se puede duplicar.</p>
          </div>
          <div className="vh-card">
            <div className="vh-card__ic"><Icon name="download" size={22} stroke="#1B5670" /></div>
            <h4>Descargable en PDF</h4>
            <p>Una vez verificado, descarga el documento oficial firmado digitalmente.</p>
          </div>
          <div className="vh-card">
            <div className="vh-card__ic"><Icon name="whatsapp" size={22} stroke="#1B5670" /></div>
            <h4>¿No encuentras tu código?</h4>
            <p>Escríbenos por WhatsApp con tu nombre completo y DNI.</p>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── PÁGINA: SOBRE NOSOTROS ────────────────────────────────────────────────────
function NosotrosPage({ onNav }) {
  const imgs = CENPROD_DATA.imgs;
  const stats = CENPROD_DATA.stats;
  const timeline = CENPROD_DATA.nosotros.timeline;
  const valores = [
    { icon:'shield', titulo:'Materiales auditados', texto:'Simulacros y casos revisados por especialistas con experiencia en concursos docentes.' },
    { icon:'whatsapp', titulo:'Tutor por WhatsApp', texto:'Resuelve dudas el mismo día. Acompañamiento real, no chatbot.' },
    { icon:'sparkle', titulo:'Plataforma simple', texto:'Diseñada para docentes sin experiencia previa con aulas virtuales.' },
    { icon:'scroll', titulo:'Certificados verificables', texto:'Cada certificado lleva código único para validar autenticidad en línea.' },
  ];
  return (
    <article className="page page--nosotros" data-screen-label="Sobre nosotros">
      <PageHero
        compact
        eyebrow="Sobre nosotros"
        title={['Formación virtual', <span key="em">para el <em>docente peruano.</em></span>]}
        sub="Más de 500 docentes capacitados · tutoría por WhatsApp · certificados descargables desde cualquier región del país."
      />
      <div className="nos">
        <div className="nos__stats">
          {stats.map((s, i) => (
            <div className="nos__stat" key={i}>
              <div className="nos__stat-num">{s.numero}</div>
              <div className="nos__stat-lbl">{s.etiqueta}</div>
            </div>
          ))}
        </div>

        <div className="nos__grid">
          <div className="nos__copy">
            <h2 className="nos__h2">Un equipo que entiende<br/>tu <em>realidad docente.</em></h2>
            <p className="nos__lead">
              <strong>CENPROD nació en 2025</strong> con una idea clara: que ningún docente del Perú
              quede fuera de un ascenso por falta de material accesible y acompañamiento real.
              Hoy capacitamos a más de <strong>500 maestros</strong> en modalidad 100% virtual,
              con tutores que responden por WhatsApp y materiales pensados para tu carga laboral.
            </p>
            <p className="nos__lead">
              Nuestro método combina <strong>simulacros alineados a la prueba real</strong>,
              tutoría personalizada y contenidos organizados por competencias.
              Trato humano, sin tecnicismos, respetando tu tiempo.
            </p>
            <div className="nos__cta">
              <button className="btn btn--primary" onClick={() => onNav('cursos')}>
                Ver cursos <Icon name="arrow-right" size={16} />
              </button>
              <button className="btn btn--ghost" onClick={() => onNav('contacto')}>
                Hablar con un asesor
              </button>
            </div>
          </div>
          <div className="nos__visual">
            <Placeholder src={imgs.equipo} ratio="4/5" tag="Equipo" alt="Equipo CENPROD" />
            <div className="nos__badge">
              <Icon name="shield" size={22} stroke="#2DB94B" />
              <div>
                <strong>Empresa formal</strong>
                <small>RUC 20601234567 · Lima, Perú</small>
              </div>
            </div>
          </div>
        </div>

        <div className="nos__vals">
          {valores.map((v, i) => (
            <div className="nos__val" key={i} style={{ animationDelay: `${i*80}ms` }}>
              <div className="nos__val-ic"><Icon name={v.icon} size={22} stroke="#1B5670" /></div>
              <h4>{v.titulo}</h4>
              <p>{v.texto}</p>
            </div>
          ))}
        </div>

        <div className="nos__timeline">
          <h3>Nuestro camino</h3>
          <ol>
            {timeline.map((t, i) => (
              <li key={i}>
                <span className="nos__year">{t.year}</span>
                <strong>{t.titulo}</strong>
                <p>{t.texto}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="nos__cta-band">
          <div>
            <h3>¿Listo para dar el siguiente paso?</h3>
            <p>Explora el catálogo o escríbenos por WhatsApp. Sin compromiso.</p>
          </div>
          <div className="nos__cta-band-btns">
            <button className="btn btn--primary" onClick={() => onNav('cursos')}>Ver catálogo</button>
            <a className="btn btn--outline" href={CENPROD_DATA.contacto.whatsappLink} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={16} stroke="#1B5670" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── PÁGINA: NOTICIAS (/blog) ──────────────────────────────────────────────────
const NEWS_SECCIONES = [
  { id: 'todos', label: 'Todas' },
  { id: 'Convocatorias', label: 'Convocatorias' },
  { id: 'Comunidad', label: 'Comunidad' },
  { id: 'Formación', label: 'Formación' },
];

function parseNewsDate(fecha) {
  const [diaRaw, mesRaw] = fecha.split(' ');
  const meses = { Ene:'ENE', Feb:'FEB', Mar:'MAR', Abr:'ABR', May:'MAY', Jun:'JUN', Jul:'JUL', Ago:'AGO', Sep:'SEP', Oct:'OCT', Nov:'NOV', Dic:'DIC' };
  return {
    dia: String(parseInt(diaRaw, 10)).padStart(2, '0'),
    mes: meses[mesRaw] || mesRaw?.slice(0, 3).toUpperCase() || '',
  };
}

function NewsDate({ fecha }) {
  const { dia, mes } = parseNewsDate(fecha);
  return (
    <time className="news-date" dateTime={fecha}>
      <span className="news-date__day">{dia}</span>
      <span className="news-date__mon">{mes}</span>
    </time>
  );
}

function NewsSeccionTag({ seccion }) {
  const cls = seccion === 'Convocatorias' ? 'news-tag--conv' : seccion === 'Comunidad' ? 'news-tag--com' : 'news-tag--form';
  return <span className={`news-tag ${cls}`}>{seccion}</span>;
}

function BlogPage() {
  const all = CENPROD_DATA.noticias;
  const [active, setActive] = useState('todos');
  const items = useMemo(
    () => (active === 'todos' ? all : all.filter(n => n.seccion === active)),
    [active, all],
  );
  const [portada, ...rest] = items.length ? items : all;
  const feed = rest;
  const ticker = all.filter(n => n.urgente || n.seccion === 'Convocatorias').slice(0, 4);

  return (
    <article className="page page--blog page--news" data-screen-label="Noticias">
      <PageHero
        compact
        eyebrow="Noticias CENPROD"
        title={['Lo que necesitas saber', <span key="em">sobre <em>concursos docentes.</em></span>]}
        sub="Convocatorias, fechas clave, eventos con docentes y guías de preparación. Actualizado para 2026."
      />

      <div className="news">
        {ticker.length > 0 && (
          <div className="news-ticker" aria-label="Titulares recientes">
            <span className="news-ticker__lbl"><span className="news-ticker__dot" /> Último minuto</span>
            <div className="news-ticker__items">
              {ticker.map(n => (
                <span className="news-ticker__item" key={n.id}>{n.titulo}</span>
              ))}
            </div>
          </div>
        )}

        <nav className="news-tabs" aria-label="Secciones de noticias">
          {NEWS_SECCIONES.map(s => (
            <button
              key={s.id}
              type="button"
              className={`news-tab ${active === s.id ? 'is-on' : ''}`}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {portada && (
          <article className="news-portada">
            <div className="news-portada__media">
              <Placeholder src={portada.img} ratio="16/10" tag={portada.urgente ? 'Urgente' : 'Portada'} alt={portada.titulo} />
            </div>
            <div className="news-portada__body">
              <div className="news-portada__meta">
                <NewsSeccionTag seccion={portada.seccion} />
                {portada.urgente ? <span className="news-tag news-tag--live">En curso</span> : null}
                <time className="news-portada__time">{portada.fecha}</time>
              </div>
              <h2 className="news-portada__title">{portada.titulo}</h2>
              <p className="news-portada__lead">{portada.resumen}</p>
              <button type="button" className="link-arrow news-portada__link">
                Leer nota completa <Icon name="arrow-right" size={16} />
              </button>
            </div>
          </article>
        )}

        <div className="news-layout">
          {feed.length > 0 && (
            <section className="news-feed" aria-label="Noticias recientes">
              <h3 className="news-block-title">
                {active === 'todos' ? 'Más noticias' : `Más en ${active}`}
              </h3>
              <ul className="news-list">
                {feed.map((n, i) => (
                  <li className="news-item" key={n.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <NewsDate fecha={n.fecha} />
                    <div className="news-item__body">
                      <div className="news-item__top">
                        <NewsSeccionTag seccion={n.seccion} />
                        <time>{n.fecha}</time>
                      </div>
                      <h4 className="news-item__title">{n.titulo}</h4>
                      <p className="news-item__excerpt">{n.resumen}</p>
                      <button type="button" className="link-arrow news-item__link">
                        Seguir leyendo <Icon name="arrow-right" size={14} />
                      </button>
                    </div>
                    <div className="news-item__thumb">
                      <Placeholder src={n.img} ratio="4/3" alt="" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <aside className="news-aside">
            <div className="news-aside-box">
              <h4>Lo más reciente</h4>
              <ol className="news-rank">
                {all.slice(0, 5).map((n, i) => (
                  <li key={n.id}>
                    <span className="news-rank__n">{i + 1}</span>
                    <div>
                      <NewsSeccionTag seccion={n.seccion} />
                      <strong>{n.titulo}</strong>
                      <small>{n.fecha}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="news-aside-box news-aside-box--dates">
              <h4>Agenda 2026</h4>
              <ul className="news-agenda">
                <li><strong>30 May</strong><span>Cierre inscripciones cursos Ascenso</span></li>
                <li><strong>Jun</strong><span>Simulacro nacional en vivo</span></li>
                <li><strong>Jul</strong><span>Encuentro docentes — Cusco</span></li>
              </ul>
            </div>
            <div className="news-aside-box news-aside-box--wa">
              <Icon name="whatsapp" size={26} stroke="#fff" />
              <h4>¿Dudas sobre una convocatoria?</h4>
              <p>Escríbenos por WhatsApp y te orientamos sin compromiso.</p>
              <a className="btn btn--green btn--sm" href={CENPROD_DATA.contacto.whatsappLink} target="_blank" rel="noreferrer">
                Contactar asesor
              </a>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

// ── TESTIMONIOS (snippet usado en home) ───────────────────────────────────────
function Testimonios() {
  const items = CENPROD_DATA.testimonios;
  return (
    <section className="testi" data-screen-label="Testimonios">
      <header className="sec__head sec__head--center">
        <span className="eyebrow eyebrow--dark"><span className="dot" /> Testimonios</span>
        <h2 className="sec__title">Docentes que ya<br/>lo <em>lograron.</em></h2>
      </header>
      <div className="testi__grid">
        {items.map((t, i) => (
          <article className="testi-card" key={i} style={{ animationDelay: `${i*90}ms` }}>
            <div className="testi-card__stars">
              {[...Array(5)].map((_,k)=>(<Icon key={k} name="star" size={16} stroke="#D49A3F" />))}
            </div>
            <blockquote>“{t.texto}”</blockquote>
            <footer>
              {t.foto
                ? <img className="testi-card__avatar testi-card__avatar--img" src={t.foto} alt={t.nombre} />
                : <span className="testi-card__avatar" style={{ background: ['#1B5670','#2DB94B','#9B6FB0'][i%3] }}>
                    {t.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </span>}
              <div>
                <strong>{t.nombre}</strong>
                <small>{t.cargo}</small>
                <span className="testi-card__chip"><Icon name="check" size={12} /> {t.escala}</span>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── PÁGINA: CONTACTO ──────────────────────────────────────────────────────────
function ContactoPage() {
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const info = CENPROD_DATA.contacto;
  const faq = CENPROD_DATA.nosotros.faqContacto;
  const programas = CENPROD_DATA.categorias;

  return (
    <article className="page page--contacto" data-screen-label="Contacto">
      <PageHero
        compact
        eyebrow="Contáctanos"
        title={['¿Tienes dudas sobre', <span key="em">tu <em>postulación?</em></span>]}
        sub="Nuestro equipo de asesores docentes te responde en menos de 1 hora hábil. Lun a Sáb, 8 am – 8 pm."
      />

      <div className="contact">
        <div className="contact__quick">
          <a className="contact-quick contact-quick--wa" href={info.whatsappLink} target="_blank" rel="noreferrer">
            <span className="contact-quick__ic"><Icon name="whatsapp" size={26} stroke="#fff" /></span>
            <div>
              <strong>WhatsApp — respuesta inmediata</strong>
              <span>{info.whatsapp} · {info.horario}</span>
            </div>
            <span className="contact-quick__arrow" aria-hidden="true">
              <Icon name="arrow-right" size={20} stroke="currentColor" />
            </span>
          </a>
          <div className="contact-quick contact-quick--info">
            <span className="contact-quick__ic contact-quick__ic--teal"><Icon name="laptop" size={22} stroke="#1B5670" /></span>
            <div>
              <strong>{info.modalidad}</strong>
              <span>Sin necesidad de desplazarte a Lima</span>
            </div>
          </div>
        </div>

        <div className="contact__grid">
          <div className="contact__left">
            <h3 className="contact__h3">Canales de atención</h3>
            <ul className="contact__list">
              <li style={{ animationDelay: '0.28s' }}>
                <a className="contact__link-row" href={info.whatsappLink} target="_blank" rel="noreferrer">
                  <span className="cc-emoji cc-emoji--wa" aria-hidden="true">
                    <svg className="cc-emoji__svg" viewBox="0 0 32 32" fill="#fff" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M16.06 4C9.4 4 4 9.4 4 16.06c0 2.12.55 4.18 1.6 6L4 28l6.07-1.59a12.06 12.06 0 0 0 5.99 1.53h.01c6.66 0 12.06-5.4 12.06-12.06A12.06 12.06 0 0 0 16.06 4Zm5.5 14.58c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07a8.2 8.2 0 0 1-4.05-3.54c-.3-.52.3-.48.86-1.6.1-.2.05-.37-.02-.52l-.93-2.24c-.24-.59-.49-.5-.68-.51l-.58-.01a1.1 1.1 0 0 0-.8.38c-.27.3-1.06 1.04-1.06 2.53s1.09 2.94 1.24 3.14c.15.2 2.15 3.29 5.22 4.6.73.32 1.3.5 1.74.65.73.23 1.4.2 1.92.12.58-.09 1.78-.73 2.04-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35Z"/>
                    </svg>
                    <span className="cc-emoji__shine" />
                  </span>
                  <div><strong>WhatsApp</strong><span>{info.whatsapp}</span></div>
                </a>
              </li>
              <li style={{ animationDelay: '0.38s' }}>
                <a className="contact__link-row" href={`mailto:${info.email}`}>
                  <span className="cc-emoji cc-emoji--mail" aria-hidden="true">
                    <svg className="cc-emoji__svg" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2.5"/>
                      <path d="M3.5 7l8.5 6 8.5-6"/>
                    </svg>
                    <span className="cc-emoji__shine" />
                  </span>
                  <div><strong>Correo</strong><span>{info.email}</span></div>
                </a>
              </li>
              <li style={{ animationDelay: '0.48s' }}>
                <div className="contact__link-row contact__link-row--static">
                  <span className="cc-emoji cc-emoji--phone" aria-hidden="true">
                    <svg className="cc-emoji__svg" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.03-.24c1.12.37 2.33.57 3.56.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/>
                    </svg>
                    <span className="cc-emoji__shine" />
                  </span>
                  <div><strong>Horario</strong><span>{info.horario}</span></div>
                </div>
              </li>
              <li style={{ animationDelay: '0.58s' }}>
                <div className="contact__link-row contact__link-row--static">
                  <span className="cc-emoji cc-emoji--pin" aria-hidden="true">
                    <svg className="cc-emoji__svg" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>
                    </svg>
                    <span className="cc-emoji__shine" />
                  </span>
                  <div><strong>Modalidad</strong><span>{info.modalidad}</span></div>
                </div>
              </li>
            </ul>

            <div className="contact__faq">
              <h4>Preguntas frecuentes</h4>
              {faq.map((item, i) => (
                <div className={`faq-item ${openFaq === i ? 'is-open' : ''}`} key={i} style={{ animationDelay: `${0.58 + i * 0.08}s` }}>
                  <button type="button" className="faq-item__q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                    {item.q}
                    <Icon name="chevron-down" size={18} />
                  </button>
                  <div className="faq-item__panel" aria-hidden={openFaq !== i}>
                    <p className="faq-item__a">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form className={`contact__form${sent ? ' is-sent' : ''}`} onSubmit={(e) => { e.preventDefault(); setSent(true); setTimeout(()=>setSent(false), 4000); }}>
            <h3>Escríbenos</h3>
            <p className="contact__form-sub">Te contactamos por WhatsApp o correo con la información que necesites.</p>
            <label><span>Nombre completo</span>
              <input required placeholder="Ej. Rosa Martínez Quispe" /></label>
            <div className="contact__row2">
              <label><span>DNI</span><input required placeholder="12345678" /></label>
              <label><span>Región</span>
                <select defaultValue=""><option value="" disabled>Selecciona…</option>
                  <option>Lima</option><option>Arequipa</option><option>Cusco</option><option>Trujillo</option><option>Piura</option><option>Otra</option>
                </select></label>
            </div>
            <label><span>Programa de interés</span>
              <select defaultValue=""><option value="" disabled>Selecciona…</option>
                {programas.map(c => (
                  <option key={c.id}>{c.nombre}</option>
                ))}
                <option>Otro / No estoy seguro</option>
              </select></label>
            <label><span>Cuéntanos brevemente</span>
              <textarea rows="3" placeholder="Ej. Postulo a IV escala y quiero más información sobre el simulacro." /></label>
            <button className="btn btn--primary btn--full" type="submit">
              {sent ? (<><Icon name="check" size={16} /> Mensaje enviado — te contactaremos pronto</>) : (<>Enviar consulta <Icon name="arrow-right" size={16} /></>)}
            </button>
            <small>Al enviar aceptas la política de tratamiento de datos.</small>
          </form>
        </div>
      </div>
    </article>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer({ onNav, onVerify }) {
  const navigate = useNavigate()
  const go = (id) => (e) => { e.preventDefault(); onNav && onNav(id); }
  const goVerify = (e) => { e.preventDefault(); onVerify ? onVerify() : onNav && onNav('verificar'); }
  const goCat = (cat) => (e) => {
    e.preventDefault()
    navigate(`/cursos?cat=${cat}`)
  }

  const courseLinks = [
    ['nombramiento', 'Nombramiento'],
    ['ascenso', 'Ascenso de Escala'],
    ['directivos', 'Cargos Directivos'],
    ['certificados', 'Certificados'],
  ]

  return (
    <footer className="ft">
      <div className="ft__main">
        <div className="ft__brand-col">
          <Link className="ft__brand" to="/" aria-label="Ir al inicio">
            <img src={logo} alt="CENPROD" />
            <div>
              <strong>CENPROD</strong>
              <small>Centro Profesional Docente</small>
            </div>
          </Link>
          <p className="ft__pitch">
            Formación virtual para docentes peruanos: ascenso, nombramiento, cargos directivos y certificaciones.
          </p>
          <div className="ft__contact">
            <a className="ft__contact-btn" href="https://wa.me/51987654321" target="_blank" rel="noreferrer">
              <Icon name="whatsapp" size={16} stroke="#fff" />
              Escríbenos por WhatsApp
            </a>
            <a className="ft__contact-link" href="/contacto" onClick={go('contacto')}>
              <Icon name="mail" size={15} stroke="currentColor" />
              contacto@cenprod.pe
            </a>
          </div>
          <div className="ft__social" aria-label="Redes sociales">
            <a href="https://wa.me/51987654321" target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" size={18} stroke="#fff" /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Facebook"><Icon name="facebook" size={18} stroke="#fff" /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Instagram"><Icon name="instagram" size={18} stroke="#fff" /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="YouTube"><Icon name="youtube" size={18} stroke="#fff" /></a>
          </div>
        </div>

        <div className="ft__col">
          <h5>Cursos</h5>
          {courseLinks.map(([id, label]) => (
            <a key={id} href={`/cursos?cat=${id}`} onClick={goCat(id)}>{label}</a>
          ))}
          <a href="/cursos" onClick={go('cursos')}>Ver catálogo completo</a>
        </div>

        <div className="ft__col">
          <h5>Recursos</h5>
          <a href="/blog" onClick={go('blog')}>Noticias</a>
          <a href="/verificar" onClick={goVerify}>Verificar certificado</a>
          <a href={`${DASHBOARD_URL}/login`}>Aula Virtual</a>
          <a href="/nosotros" onClick={go('nosotros')}>Sobre nosotros</a>
        </div>

        <div className="ft__col">
          <h5>Soporte</h5>
          <a href="/contacto" onClick={go('contacto')}>Contáctanos</a>
          <a href="/verificar" onClick={goVerify}>Validar certificado QR</a>
          <span className="ft__meta">Lun – Sáb · 8:00 am – 8:00 pm</span>
          <span className="ft__meta">Atención 100% virtual · Todo el Perú</span>
        </div>
      </div>

      <div className="ft__bot">
        <small>© 2026 CENPROD · RUC 20601234567 · Lima, Perú</small>
        <small>Hecho con cariño para docentes peruanos.</small>
      </div>
    </footer>
  );
}

export { ProductosPage, VerificarPage, NosotrosPage, BlogPage, ContactoPage, Testimonios, Footer };

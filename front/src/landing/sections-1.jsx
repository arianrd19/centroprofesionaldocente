import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from './icons.jsx'
import { CENPROD_DATA } from './data.js'
import { landingPath, DASHBOARD_URL } from './paths.js'
import logo from '../assets/logo.png'

// ── Imagen: usa src real si existe; placeholder rayado de fallback ────────────
function Placeholder({ label, ratio = '16/10', tone = 'cream', tag, src, alt, children, className = '' }) {
  if (src) {
    return (
      <div className={`ph ph--img ${className}`} style={{ aspectRatio: ratio }}>
        <img src={src} alt={alt || label || ''} loading="lazy" />
        {tag ? <span className="ph-tag">{tag}</span> : null}
        {children}
      </div>
    );
  }
  const tones = {
    cream:  { bg: '#EFE9DC', stripe: 'rgba(27,86,112,.08)', ink: '#1B5670' },
    teal:   { bg: '#0E3F54', stripe: 'rgba(255,255,255,.06)', ink: '#FFFFFF' },
    soft:   { bg: '#F4EFE5', stripe: 'rgba(0,0,0,.04)', ink: '#0F2A36' },
    green:  { bg: '#E6F4E8', stripe: 'rgba(45,185,75,.10)', ink: '#0E3F54' },
  }[tone] || { bg: '#EFE9DC', stripe: 'rgba(0,0,0,.05)', ink: '#1B5670' };
  return (
    <div className={`ph ${className}`} style={{
      aspectRatio: ratio, background: tones.bg, color: tones.ink,
      backgroundImage: `repeating-linear-gradient(135deg, ${tones.stripe} 0 12px, transparent 12px 24px)`,
    }}>
      {tag ? <span className="ph-tag" style={{ color: tones.ink }}>{tag}</span> : null}
      <span className="ph-label" style={{ color: tones.ink }}>{label}</span>
      {children}
    </div>
  );
}

// ── HEADER (con estado de página activa) ──────────────────────────────────────
function Header({ cartCount, onOpenCart, onNav, page }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const links = [
    ['inicio', 'Inicio'],
    ['cursos', 'Cursos'],
    ['verificar', 'Verificar certificado'],
    ['blog', 'Noticias'],
    ['nosotros', 'Sobre nosotros'],
    ['contacto', 'Contáctanos'],
  ];
  return (
    <header className={`hd ${scrolled ? 'hd--scrolled' : ''}`}>
      <Link className="hd__brand" to="/" aria-label="Ir al inicio — CENPROD">
        <img src={logo} alt="CENPROD" />
        <span className="hd__brand-txt">Centro Profesional Docente</span>
      </Link>
      <nav className={`hd__nav ${open ? 'is-open' : ''}`} aria-label="Principal">
        {links.map(([id, label]) => (
          <a key={id} href={landingPath(id)}
             className={page === id ? 'is-active' : ''}
             aria-current={page === id ? 'page' : undefined}
             onClick={(e) => { e.preventDefault(); onNav(id); setOpen(false); }}>
            {label}
          </a>
        ))}
      </nav>
      <div className="hd__cta">
        <button className="hd__cart" onClick={onOpenCart} aria-label="Carrito">
          <Icon name="cart" size={20} />
          {cartCount > 0 ? <span className="hd__cart-badge">{cartCount}</span> : null}
        </button>
        <a className="hd__aula" href={`${DASHBOARD_URL}/login`}>
          <Icon name="classroom" size={18} />
          <span>Aula Virtual</span>
        </a>
        <button className="hd__burger" onClick={() => setOpen(v => !v)} aria-label="Menú">
          <Icon name={open ? 'x' : 'menu'} size={22} />
        </button>
      </div>
    </header>
  );
}

// ── HERO ──────────────────────────────────────────────────────────────────────
function Hero({ onNav }) {
  const imgs = CENPROD_DATA.imgs;
  const heroStat = CENPROD_DATA.stats[0];
  return (
    <section id="inicio" className="hero" data-screen-label="Inicio">
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__blob hero__blob--1" />
        <div className="hero__blob hero__blob--2" />
        <svg className="hero__arrow" viewBox="0 0 200 240" aria-hidden="true">
          <path d="M100 20 L160 100 L130 100 L130 220 L70 220 L70 100 L40 100 Z" fill="currentColor" opacity=".08"/>
        </svg>
      </div>
      <div className="hero__inner">
        <div className="hero__copy">
          <span className="eyebrow">
            <span className="dot" /> Convocatoria Ascenso de Escala 2026 — abierta
          </span>
          <h1 className="hero__title">
            Sube de <em>escala</em>,<br/>certifícate y<br/>consolida tu carrera <u>docente</u>.
          </h1>
          <p className="hero__sub">
            Cursos virtuales con tutoría personalizada para docentes que postulan a
            la <strong>Escala Magisterial</strong>, <strong>Cargos Directivos</strong> y
            programas con certificado descargable.
          </p>
          <div className="hero__ctas">
            <button className="btn btn--primary" onClick={() => onNav('cursos')}>
              Ver catálogo <Icon name="arrow-right" size={18} />
            </button>
            <button className="btn btn--ghost" onClick={() => onNav('verificar')}>
              <Icon name="seal" size={18} /> Verificar mi certificado
            </button>
          </div>
          <ul className="hero__trust">
            <li><Icon name="check-circle" size={16} /> Tutor por WhatsApp</li>
            <li><Icon name="check-circle" size={16} /> Certificado descargable</li>
            <li><Icon name="check-circle" size={16} /> 100% virtual · Todo el Perú</li>
          </ul>
        </div>
        <div className="hero__visual">
          <div className="hcard hcard--photo">
            <Placeholder src={imgs.heroPrincipal} ratio="4/5" tag="Aula real" alt="Docente en aula" />
            <div className="hcard__chip">
              <Icon name="play" size={16} stroke="#1B5670" />
              <span>Mira cómo enseñamos</span>
            </div>
          </div>
          <div className="hcard hcard--stat">
            <div className="hcard__stat-num">{heroStat.numero}</div>
            <div className="hcard__stat-lbl">{heroStat.etiqueta} con CENPROD</div>
            <div className="hcard__faces">
              {['#1B5670','#2DB94B','#D49A3F','#9B6FB0'].map((c,i)=>(
                <span key={i} className="face" style={{ background: c, zIndex: 10-i }} />
              ))}
              <span className="face face--more">{heroStat.numero}</span>
            </div>
          </div>
          <div className="hcard hcard--cert">
            <div className="hcard__cert-head">
              <Icon name="seal" size={18} stroke="#2DB94B" />
              <span>Certificado verificado</span>
            </div>
            <div className="hcard__cert-name">María F. Quispe</div>
            <div className="hcard__cert-line">Ascenso de Escala · 120 hrs</div>
            <div className="hcard__cert-code">CPD-2025-04812</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = CENPROD_DATA.stats;
  return (
    <section className="stats" aria-label="CENPROD en números">
      {stats.map((s, i) => (
        <div className="stat" key={i}>
          <div className="stat__num">{s.numero}</div>
          <div className="stat__lbl">{s.etiqueta}</div>
        </div>
      ))}
    </section>
  );
}

// ── CATEGORÍAS (en home — links a productos filtrado) ────────────────────────
function Categorias({ onPick }) {
  const cats = CENPROD_DATA.categorias;
  return (
    <section id="categorias" className="cats" data-screen-label="Categorías">
      <header className="sec__head">
        <span className="eyebrow eyebrow--dark"><span className="dot" /> Nuestros programas</span>
        <h2 className="sec__title">Elige tu camino<br/><em>profesional.</em></h2>
        <p className="sec__sub">Cuatro líneas formativas pensadas para cada etapa de tu carrera docente en el Perú. Haz clic para ver el catálogo filtrado.</p>
      </header>
      <div className="cats__grid">
        {cats.map((c, i) => (
          <button className={`cat cat--${c.id}`} key={c.id} onClick={() => onPick(c.id)} style={{ animationDelay: `${i*80}ms` }}>
            <div className="cat__icon"><Icon name={c.icon} size={28} stroke="#1B5670" strokeWidth={1.6} /></div>
            <div className="cat__body">
              <h3>{c.nombre}</h3>
              <p>{c.subtitulo}</p>
            </div>
            <div className="cat__foot">
              <span>{c.cursos} programas</span>
              <Icon name="arrow-right" size={16} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── CTA Banner (al final del home) ────────────────────────────────────────────
function CtaBanner({ onNav }) {
  return (
    <section className="cta-banner">
      <div className="cta-banner__inner">
        <div>
          <span className="eyebrow eyebrow--on-teal"><span className="dot dot--green" /> Empieza hoy</span>
          <h2 className="sec__title sec__title--light">
            Tu próximo ascenso<br/>empieza con <em>una decisión.</em>
          </h2>
          <p>Habla con un asesor docente o explora el catálogo. Sin compromiso.</p>
        </div>
        <div className="cta-banner__btns">
          <button className="btn btn--green" onClick={() => onNav('cursos')}>
            Ver cursos <Icon name="arrow-right" size={18} />
          </button>
          <a className="btn btn--ghost-light" href="#" onClick={(e)=>e.preventDefault()}>
            <Icon name="whatsapp" size={18} stroke="#fff" /> Asesor por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Page hero (encabezado pequeño para páginas internas) ──────────────────────
function PageHero({ eyebrow, title, sub, accent, compact }) {
  return (
    <section className={`phero${compact ? ' phero--compact' : ''}`}>
      <div className="phero__inner">
        <span className="eyebrow eyebrow--dark"><span className="dot" /> {eyebrow}</span>
        <h1 className="phero__title">
          {title.map((t, i) => <span key={i}>{t}{i < title.length-1 ? <br/> : null}</span>)}
        </h1>
        {sub ? <p className="phero__sub">{sub}</p> : null}
      </div>
      {accent ? <div className="phero__accent" aria-hidden="true">{accent}</div> : null}
    </section>
  );
}

export { Header, Hero, Stats, Categorias, CtaBanner, PageHero, Placeholder };

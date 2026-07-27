import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from './sections-1.jsx'
import { Footer } from './sections-2.jsx'
import { MiniCart, CartToast } from './cart.jsx'
import Icon from './icons.jsx'
import { landingPath, LANDING_PAGES } from './paths.js'
import './styles.css'
import './styles-pages.css'

const LANDING_PAGES_NAV = LANDING_PAGES.filter((p) => p !== 'inicio')

function PromoBar({ onNav }) {
  return (
    <div className="promo">
      <span className="promo__dot" />
      <strong>Convocatoria Ascenso 2026</strong>
      <span className="promo__sep">·</span>
      <span>El examen será el <b>12 de octubre</b></span>
      <a href="/cursos" onClick={(e) => { e.preventDefault(); onNav('cursos') }}>
        Ver cursos <Icon name="arrow-right" size={14} />
      </a>
    </div>
  )
}

function FloatActions() {
  const [show, setShow] = useState(false)
  const [openCard, setOpenCard] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 220)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (show && !dismissed) {
      const t = setTimeout(() => setOpenCard(true), 600)
      return () => clearTimeout(t)
    }
  }, [show, dismissed])

  return (
    <div className={`fab ${show ? 'fab--on' : ''}`}>
      {openCard && (
        <div className="fab__card" role="dialog" aria-label="Chat con asesor">
          <button type="button" className="fab__card-x" onClick={() => { setOpenCard(false); setDismissed(true) }} aria-label="Cerrar">
            <Icon name="x" size={14} stroke="#1B5670" />
          </button>
          <div className="fab__card-head">
            <span className="fab__avatar">
              <Icon name="users" size={18} stroke="#fff" />
              <span className="fab__avatar-dot" />
            </span>
            <div>
              <strong>Asesor docente CENPROD</strong>
              <span className="fab__status"><span className="fab__status-dot" /> En línea · responde en minutos</span>
            </div>
          </div>
          <p className="fab__card-msg">¡Hola! 👋 ¿Te ayudo a elegir el curso ideal para tu próximo ascenso o diplomado?</p>
          <a className="fab__card-btn" href="https://wa.me/51987654321" target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={18} stroke="#fff" />
            Iniciar chat por WhatsApp
          </a>
        </div>
      )}
      <a className="fab__wa" href="https://wa.me/51987654321" target="_blank" rel="noreferrer" aria-label="Escríbenos por WhatsApp">
        <Icon name="whatsapp" size={28} stroke="#fff" />
        <span className="fab__wa-dot" aria-hidden="true" />
        {!openCard && <span className="fab__tip">Habla con un asesor</span>}
      </a>
    </div>
  )
}

export function useLandingNav() {
  const navigate = useNavigate()

  const goVerify = () => navigate('/verificar')
  const goHome = () => navigate('/')

  const nav = (id) => {
    if (id === 'verificar') {
      goVerify()
      return
    }
    if (id === 'inicio') {
      goHome()
      return
    }
    if (LANDING_PAGES_NAV.includes(id)) {
      navigate(landingPath(id))
    }
  }

  return { nav, goVerify, goHome }
}

export default function LandingPublicLayout({ activePage = 'inicio', children }) {
  const { nav, goVerify } = useLandingNav()
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cenprod-cart')
      if (saved) setCart(JSON.parse(saved))
    } catch (_) { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('cenprod-cart', JSON.stringify(cart)) } catch (_) { /* ignore */ }
  }, [cart])

  const removeFromCart = (id) => setCart((c) => c.filter((x) => x.id !== id))
  const clearCart = () => setCart([])

  return (
    <div className="app">
      <PromoBar onNav={nav} />
      <Header
        cartCount={cart.length}
        onOpenCart={() => setCartOpen((v) => !v)}
        onNav={nav}
        page={activePage}
      />
      <MiniCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onRemove={removeFromCart}
        onClear={clearCart}
      />
      <main className="page-stage">{children}</main>
      <Footer onNav={nav} onVerify={goVerify} />
      <FloatActions />
      <CartToast data={toast} />
    </div>
  )
}

export { PromoBar, FloatActions }

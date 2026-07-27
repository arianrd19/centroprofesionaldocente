import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header, Hero, Stats, Categorias, CtaBanner } from './sections-1.jsx'
import {
  ProductosPage,
  NosotrosPage,
  BlogPage,
  ContactoPage,
  Testimonios,
  Footer,
} from './sections-2.jsx'
import { MiniCart, CartToast } from './cart.jsx'
import { PromoBar, FloatActions, useLandingNav } from './LandingPublicLayout.jsx'
import { landingPath, LEGACY_HASH_PAGES } from './paths.js'
import './styles.css'
import './styles-pages.css'

function HomePage({ onNav, pickCategoria }) {
  return (
    <article className="page page--home">
      <Hero onNav={onNav} />
      <Stats />
      <Categorias onPick={pickCategoria} />
      <Testimonios />
      <CtaBanner onNav={onNav} />
    </article>
  )
}

export default function LandingSite({ page = 'inicio' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { goVerify } = useLandingNav()
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [filterCat, setFilterCat] = useState(null)
  const [toast, setToast] = useState(null)
  const cartIds = useMemo(() => new Set(cart.map((c) => c.id)), [cart])

  useEffect(() => {
    const hash = location.hash?.slice(1).split('?')[0]
    if (!hash || !LEGACY_HASH_PAGES.includes(hash)) return
    navigate(landingPath(hash), { replace: true })
  }, [location.hash, navigate])

  useEffect(() => {
    if (page !== 'cursos') return
    const cat = new URLSearchParams(location.search).get('cat')
    setFilterCat(cat || null)
  }, [page, location.search])

  const nav = (id) => {
    if (id === 'verificar') {
      goVerify()
      return
    }
    if (id === 'inicio') {
      navigate('/')
      return
    }
    if (id === 'cursos') {
      setFilterCat(null)
      navigate('/cursos')
      return
    }
    navigate(landingPath(id))
  }

  const pickCategoria = (catId) => {
    navigate(`/cursos?cat=${encodeURIComponent(catId)}`)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cenprod-cart')
      if (saved) setCart(JSON.parse(saved))
    } catch (_) { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('cenprod-cart', JSON.stringify(cart)) } catch (_) { /* ignore */ }
  }, [cart])

  const addToCart = (p) => {
    if (cartIds.has(p.id)) return
    setCart((c) => [...c, p])
    setToast({ titulo: p.titulo, t: Date.now() })
    setCartOpen(true)
    setTimeout(() => setToast(null), 2400)
  }

  const headerPage = page === 'inicio' ? 'inicio' : page

  return (
    <div className="app">
      <PromoBar onNav={nav} />
      <Header
        cartCount={cart.length}
        onOpenCart={() => setCartOpen((v) => !v)}
        onNav={nav}
        page={headerPage}
      />
      <MiniCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onRemove={(id) => setCart((c) => c.filter((x) => x.id !== id))}
        onClear={() => setCart([])}
      />

      <main key={page} className="page-stage">
        {page === 'inicio' && <HomePage onNav={nav} pickCategoria={pickCategoria} />}
        {page === 'cursos' && (
          <ProductosPage
            filterCat={filterCat}
            onClearFilter={() => {
              setFilterCat(null)
              navigate('/cursos', { replace: true })
            }}
            onAdd={addToCart}
            cartIds={cartIds}
          />
        )}
        {page === 'blog' && <BlogPage />}
        {page === 'nosotros' && <NosotrosPage onNav={nav} />}
        {page === 'contacto' && <ContactoPage />}
      </main>

      <Footer onNav={nav} onVerify={goVerify} />
      <FloatActions />
      <CartToast data={toast} />
    </div>
  )
}

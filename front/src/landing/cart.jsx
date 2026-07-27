import { useState, useEffect, useRef } from 'react'
import Icon from './icons.jsx'

export function MiniCart({ open, onClose, items, onRemove, onClear, onGoProducts }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.hd__cart')) onClose()
    }
    const onEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onClose])

  const total = items.reduce((s, it) => s + (it.precio || 0), 0)
  const ahorro = items.reduce((s, it) => s + ((it.precioAntes || it.precio) - it.precio), 0)

  return (
    <div className={`mc ${open ? 'mc--open' : ''}`} ref={ref} aria-hidden={!open}>
      <div className="mc__arrow" aria-hidden="true" />
      <header className="mc__head">
        <div>
          <strong>Mi carrito</strong>
          <small>{items.length} {items.length === 1 ? 'curso' : 'cursos'}</small>
        </div>
        <button type="button" className="mc__x" onClick={onClose} aria-label="Cerrar carrito"><Icon name="x" size={18} /></button>
      </header>
      <div className="mc__body">
        {items.length === 0 ? (
          <div className="mc__empty">
            <div className="mc__empty-ic"><Icon name="cart" size={28} stroke="#1B5670" /></div>
            <strong>Tu carrito está vacío</strong>
            <p>Explora el catálogo y añade el curso que necesites para tu postulación.</p>
          </div>
        ) : (
          <ul className="mc__list">
            {items.map((it) => (
              <li key={it.id} className="mc__item">
                <div className="mc__thumb" style={{ background: it.destacado ? '#0E3F54' : '#EFE9DC' }}>
                  <Icon name={
                    it.categoria === 'nombramiento' ? 'seal' :
                    it.categoria === 'ascenso' ? 'ladder' :
                    it.categoria === 'directivos' ? 'crown' :
                    it.categoria === 'diplomados' ? 'graduation' :
                    it.categoria === 'webinars' ? 'play' : 'scroll'
                  } size={18} stroke={it.destacado ? '#fff' : '#1B5670'} />
                </div>
                <div className="mc__info">
                  <strong>{it.titulo}</strong>
                  <small>{it.duracion} · {it.modulos} {it.modulos === 1 ? 'sesión' : 'módulos'}</small>
                  <div className="mc__price">
                    {it.precioAntes ? <s>S/ {it.precioAntes}</s> : null}
                    <b>{it.precio === 0 ? 'Gratis' : `S/ ${it.precio}`}</b>
                  </div>
                </div>
                <button type="button" className="mc__rm" onClick={() => onRemove(it.id)} aria-label="Quitar"><Icon name="x" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length > 0 ? (
        <footer className="mc__foot">
          {ahorro > 0 ? <div className="mc__save">Estás ahorrando <strong>S/ {ahorro}</strong></div> : null}
          <div className="mc__total">
            <span>Total</span>
            <strong>S/ {total}</strong>
          </div>
          <button type="button" className="btn btn--primary btn--full">
            Ir a pagar <Icon name="arrow-right" size={16} />
          </button>
          <div className="mc__pays">
            <Icon name="shield" size={14} stroke="#2DB94B" />
            <span>Pago seguro · Visa, Yape, Plin, BCP</span>
          </div>
          <button type="button" className="mc__clear" onClick={onClear}>Vaciar carrito</button>
        </footer>
      ) : null}
    </div>
  )
}

export function CartToast({ data }) {
  if (!data) return null
  return (
    <div className="toast" key={data.t}>
      <span className="toast__ic"><Icon name="check" size={16} stroke="#fff" /></span>
      <div>
        <strong>Añadido al carrito</strong>
        <small>{data.titulo}</small>
      </div>
    </div>
  )
}

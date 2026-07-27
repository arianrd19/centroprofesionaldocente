import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import LandingPublicLayout from '../landing/LandingPublicLayout'
import { PageHero } from '../landing/sections-1.jsx'
import Icon from '../landing/icons.jsx'

function Verificar() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/public/buscar', { codigo: codigo.trim() })

      if (response.data.found) {
        navigate(`/certificado/${codigo.trim()}`)
      } else {
        setError('Código no encontrado. Por favor verifica el código e intenta nuevamente.')
      }
    } catch (_) {
      setError('Error al buscar el certificado. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LandingPublicLayout activePage="verificar">
      <article className="page page--verify" data-screen-label="Verificar certificado">
        <PageHero
          compact
          eyebrow="Verificación de certificados"
          title={['¿Tu certificado', <span key="em"><em>es auténtico?</em></span>]}
          sub="Ingresa el código único de tu certificado CENPROD para validar su autenticidad."
        />
        <div className="verify">
          <div className="verify__panel">
            <div className="verify__left">
              <span className="eyebrow eyebrow--on-teal"><span className="dot dot--green" /> Verificación oficial</span>
              <h2 className="sec__title sec__title--light sec__title--sm">Ingresa el código<br />para validar.</h2>
              <p className="verify__sub">
                El código aparece en tu certificado o en el código QR escaneado.
              </p>
              <form className="verify__form" onSubmit={handleSubmit}>
                <div className="verify__input">
                  <Icon name="seal" size={18} stroke="#2DB94B" />
                  <input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ej. A1B2C3D4E5"
                    aria-label="Código de certificado"
                    required
                    disabled={loading}
                  />
                </div>
                <button className="btn btn--green" type="submit" disabled={loading}>
                  {loading ? 'Buscando…' : (<>Verificar <Icon name="arrow-right" size={16} /></>)}
                </button>
              </form>
              {error && (
                <div className="verify__err verify__err--inline">
                  <Icon name="x" size={18} stroke="#FF8A6B" />
                  <p>{error}</p>
                </div>
              )}
            </div>
            <div className="verify__right">
              <div className="verify__empty">
                <Icon name="search" size={32} stroke="rgba(255,255,255,.4)" />
                <p>El resultado aparecerá aquí tras la búsqueda, o serás redirigido al certificado.</p>
              </div>
            </div>
          </div>

          <div className="verify-help">
            <div className="vh-card">
              <div className="vh-card__ic"><Icon name="shield" size={22} stroke="#1B5670" /></div>
              <h4>Código único e irrepetible</h4>
              <p>Cada certificado emitido por CENPROD tiene un código verificable en nuestro sistema.</p>
            </div>
            <div className="vh-card">
              <div className="vh-card__ic"><Icon name="download" size={22} stroke="#1B5670" /></div>
              <h4>Certificado digital</h4>
              <p>Al verificar, puedes ver y descargar el certificado en formato digital.</p>
            </div>
            <div className="vh-card">
              <div className="vh-card__ic"><Icon name="whatsapp" size={22} stroke="#1B5670" /></div>
              <h4>¿No encuentras tu código?</h4>
              <p>Escríbenos por WhatsApp con tu nombre completo y DNI.</p>
            </div>
          </div>
        </div>
      </article>
    </LandingPublicLayout>
  )
}

export default Verificar

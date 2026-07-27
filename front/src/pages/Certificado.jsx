import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { getApiUrl } from '../utils/api'
import logo from '../assets/logo.png'
import logoInst from '../assets/Logo_INST.png'
import LandingPublicLayout from '../landing/LandingPublicLayout'
import Icon from '../landing/icons.jsx'
import CertPdfPreview from '../components/CertPdfPreview'
import './Certificado.css'

function CertificadoContent({ loading, error, certificado, codigo, navigate }) {
  if (loading) {
    return (
      <div className="cert-status cert-status--loading">
        <p>Cargando certificado…</p>
      </div>
    )
  }

  if (error || !certificado) {
    return (
      <div className="cert-status cert-status--error">
        <Icon name="x" size={28} stroke="#ef4444" />
        <h2>Certificado no encontrado</h2>
        <p>{error || 'El certificado solicitado no existe o ha sido eliminado.'}</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/verificar')}>
          Volver a verificar <Icon name="arrow-right" size={16} />
        </button>
      </div>
    )
  }

  const isAnulado = certificado.estado === 'ANULADO'
  const nombreCompleto = `${certificado.nombres} ${certificado.apellidos}`.trim()

  const pdfUrl = getApiUrl(`/public/certificados/${codigo}/pdf`)

  const handleDownloadPDF = () => {
    window.open(`/pdf/${codigo}`, '_blank')
  }

  return (
    <section className="cert-page">
      <div className="cert-page__inner">
        <header className="cert-intro">
          <span className="eyebrow eyebrow--dark">
            <span className="dot" />
            {isAnulado ? 'Certificado anulado' : 'Certificado verificado'}
          </span>
          <div className="cert-intro__main">
            <h1 className="cert-intro__title">
              {isAnulado ? (
                <>Este certificado <em>no es válido.</em></>
              ) : (
                <>Certificado <em>auténtico.</em></>
              )}
            </h1>
            <p className="cert-intro__sub">
              {isAnulado
                ? 'El código existe en el sistema pero fue marcado como anulado.'
                : 'Los datos coinciden con nuestros registros oficiales de CENPROD.'}
            </p>
          </div>
        </header>

        {isAnulado && (
          <div className="cert-alert-anulado">
            <strong>Certificado anulado</strong>
            <p>Este documento ya no tiene validez oficial.</p>
          </div>
        )}

        <div className="cert-layout">
          <aside className="cert-info">
            <div className="cert-info__head">
              <img src={logo} alt="CENPROD" className="cert-info__logo" />
              <div>
                <h2>Datos del certificado</h2>
                <span className={`cert-badge ${isAnulado ? 'cert-badge--bad' : 'cert-badge--ok'}`}>
                  {isAnulado ? 'Anulado' : 'Válido'}
                </span>
              </div>
              <img src={logoInst} alt="Institución" className="cert-info__logo cert-info__logo--inst" />
            </div>

            <dl className="cert-dl">
              <div>
                <dt>Nombre completo</dt>
                <dd className="cert-dl__highlight">{nombreCompleto}</dd>
              </div>
              <div>
                <dt>Curso</dt>
                <dd>{certificado.curso}</dd>
              </div>
              {certificado.horas && (
                <div>
                  <dt>Duración</dt>
                  <dd>{certificado.horas} horas</dd>
                </div>
              )}
              <div>
                <dt>Fecha de emisión</dt>
                <dd>{certificado.fecha_emision}</dd>
              </div>
              <div>
                <dt>Código</dt>
                <dd className="cert-dl__code">{certificado.codigo}</dd>
              </div>
            </dl>

            <div className="cert-actions">
              <button type="button" className="btn btn--primary btn--full" onClick={handleDownloadPDF}>
                <Icon name="book" size={16} /> Ver PDF completo
              </button>
              <a
                className="btn btn--green btn--full"
                href={getApiUrl(`/public/certificados/${codigo}/pdf?download=true`)}
              >
                <Icon name="download" size={16} /> Descargar certificado
              </a>
              <button type="button" className="btn btn--ghost-dark btn--full" onClick={() => navigate('/verificar')}>
                <Icon name="search" size={16} /> Verificar otro
              </button>
            </div>
          </aside>

          <section className="cert-preview" aria-label="Vista previa del certificado">
            <CertPdfPreview url={pdfUrl} />
          </section>
        </div>
      </div>
    </section>
  )
}

function Certificado() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [certificado, setCertificado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCertificado = async () => {
      try {
        const response = await api.get(`/public/certificados/${codigo}`)
        if (response.data.found) {
          setCertificado(response.data)
        } else {
          setError('Certificado no encontrado')
        }
      } catch (_) {
        setError('Error al cargar el certificado')
      } finally {
        setLoading(false)
      }
    }

    fetchCertificado()
  }, [codigo])

  return (
    <LandingPublicLayout activePage="verificar">
      <article className="page page--cert" data-screen-label="Certificado">
        <CertificadoContent
          loading={loading}
          error={error}
          certificado={certificado}
          codigo={codigo}
          navigate={navigate}
        />
      </article>
    </LandingPublicLayout>
  )
}

export default Certificado

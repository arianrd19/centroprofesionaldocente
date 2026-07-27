import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { getApiUrl } from '../utils/api'

function PdfFullView() {
    const { codigo } = useParams()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Establecer título de la pestaña
        document.title = codigo || 'Certificado'

        // Eliminar márgenes y padding del body y html para pantalla completa
        const originalBodyStyle = document.body.style.cssText
        const originalHtmlStyle = document.documentElement.style.cssText

        document.body.style.margin = '0'
        document.body.style.padding = '0'
        document.body.style.overflow = 'hidden'
        document.body.style.backgroundColor = '#525659'
        document.documentElement.style.margin = '0'
        document.documentElement.style.padding = '0'
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.style.backgroundColor = '#525659'

        // Verificar si existe el certificado (opcional, pero buena práctica para UX)
        const checkCertificate = async () => {
            try {
                await api.get(`/public/certificados/${codigo}`)
            } catch (error) {
                console.error('Error verificando certificado:', error)
            } finally {
                setLoading(false)
            }
        }

        if (codigo) {
            checkCertificate()
        }

        // Cleanup: restaurar estilos originales al desmontar
        return () => {
            document.body.style.cssText = originalBodyStyle
            document.documentElement.style.cssText = originalHtmlStyle
        }
    }, [codigo])

    // URL del PDF
    const pdfUrl = getApiUrl(`/public/certificados/${codigo}/pdf`)

    return (
        <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#525659' }}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontFamily: 'sans-serif'
                }}>
                    Cargando visor...
                </div>
            )}
            <iframe
                src={`${pdfUrl}#toolbar=1&view=FitH`}
                width="100%"
                height="100%"
                style={{ border: 'none', display: loading ? 'none' : 'block' }}
                title={`Certificado ${codigo}`}
            />
        </div>
    )
}

export default PdfFullView

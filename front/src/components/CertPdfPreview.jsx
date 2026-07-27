import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function isRenderCancelled(err) {
  return err?.name === 'RenderingCancelledException'
}

function CertPdfPreview({ url }) {
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const pdfDocRef = useRef(null)
  const renderTaskRef = useRef(null)
  const renderTokenRef = useRef(0)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    pdfDocRef.current = null
    renderTokenRef.current += 1

    const renderPage = async () => {
      const pdfDoc = pdfDocRef.current
      const frame = frameRef.current
      const canvas = canvasRef.current
      if (!pdfDoc || !frame || !canvas) return false

      const width = frame.clientWidth
      const height = frame.clientHeight
      if (width < 1 || height < 1) return false

      const token = ++renderTokenRef.current

      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel()
        } catch (_) {
          /* ignore */
        }
        renderTaskRef.current = null
      }

      try {
        const page = await pdfDoc.getPage(1)
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = Math.min(width / baseViewport.width, height / baseViewport.height)
        const viewport = page.getViewport({ scale })
        const context = canvas.getContext('2d')
        const dpr = window.devicePixelRatio || 1

        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        context.setTransform(dpr, 0, 0, dpr, 0, 0)

        const task = page.render({ canvasContext: context, viewport })
        renderTaskRef.current = task
        await task.promise

        if (cancelled || token !== renderTokenRef.current) return true

        renderTaskRef.current = null
        setStatus('ready')
        return true
      } catch (err) {
        if (isRenderCancelled(err)) return false
        throw err
      }
    }

    const loadPdf = async () => {
      setStatus('loading')

      try {
        const response = await fetch(url, { credentials: 'include' })
        if (!response.ok) throw new Error('fetch failed')

        const buffer = await response.arrayBuffer()
        if (cancelled) return

        pdfDocRef.current = await pdfjsLib.getDocument({ data: buffer }).promise
        if (cancelled) return

        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        })
        if (cancelled) return

        await renderPage()
      } catch (_) {
        if (!cancelled) setStatus('error')
      }
    }

    loadPdf()

    const frame = frameRef.current
    if (!frame) {
      return () => {
        cancelled = true
      }
    }

    let rafId = 0
    const ro = new ResizeObserver(() => {
      if (!pdfDocRef.current || cancelled) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        renderPage().catch(() => {})
      })
    })
    ro.observe(frame)

    return () => {
      cancelled = true
      renderTokenRef.current += 1
      ro.disconnect()
      cancelAnimationFrame(rafId)
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel().catch(() => {})
        renderTaskRef.current = null
      }
    }
  }, [url])

  return (
    <div className="cert-preview__frame" ref={frameRef}>
      {status === 'loading' && (
        <p className="cert-preview__status">Cargando vista previa…</p>
      )}
      {status === 'error' && (
        <p className="cert-preview__status cert-preview__status--error">
          No se pudo cargar la vista previa del certificado.
        </p>
      )}
      <canvas
        ref={canvasRef}
        className="cert-preview__canvas"
        aria-label="Vista previa del certificado"
      />
    </div>
  )
}

export default CertPdfPreview

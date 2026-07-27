import { useEffect, useRef, useState } from 'react'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function ComprobanteUpload({ file, onChange, error }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const validateAndSet = (f) => {
    setLocalError('')
    if (!f) {
      onChange(null)
      return
    }
    if (!ACCEPT_TYPES.includes(f.type)) {
      setLocalError('Solo se permiten JPG, PNG, WEBP o PDF.')
      onChange(null)
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setLocalError('El archivo supera 8 MB.')
      onChange(null)
      return
    }
    onChange(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndSet(f)
  }

  const zoneClass = [
    'venta-form__dropzone',
    dragging ? 'venta-form__dropzone--drag' : '',
    file ? 'venta-form__dropzone--filled' : '',
    error || localError ? 'venta-form__dropzone--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const isPdf = file?.type === 'application/pdf'

  return (
    <div className="venta-form__upload">
      <label className="venta-form__label">
        Comprobante de pago <span>*</span>
      </label>

      <div
        className={zoneClass}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!file) inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if (!file && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role="button"
        tabIndex={file ? -1 : 0}
        aria-label="Subir comprobante de pago"
      >
        <input
          ref={inputRef}
          type="file"
          className="venta-form__dropzone-input"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required={!file}
          onChange={(e) => validateAndSet(e.target.files?.[0] || null)}
        />

        {!file ? (
          <>
            <span className="venta-form__dropzone-icon" aria-hidden>📎</span>
            <p className="venta-form__dropzone-title">Arrastra tu comprobante aquí</p>
            <p className="venta-form__dropzone-text">
              Imagen (JPG, PNG, WEBP) o PDF · Máximo 8 MB
            </p>
            <button
              type="button"
              className="venta-form__dropzone-btn"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
            >
              Elegir archivo
            </button>
          </>
        ) : (
          <div className="venta-form__file-preview">
            {preview ? (
              <img src={preview} alt="Vista previa del comprobante" className="venta-form__file-thumb" />
            ) : (
              <div className="venta-form__file-pdf" aria-hidden>PDF</div>
            )}
            <div className="venta-form__file-meta">
              <p className="venta-form__file-name">{file.name}</p>
              <p className="venta-form__file-size">
                {formatBytes(file.size)} · {isPdf ? 'Documento PDF' : 'Imagen'}
              </p>
              <div className="venta-form__file-actions">
                <button
                  type="button"
                  className="venta-form__file-link"
                  onClick={() => inputRef.current?.click()}
                >
                  Cambiar archivo
                </button>
                <button
                  type="button"
                  className="venta-form__file-remove"
                  onClick={() => {
                    validateAndSet(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {(error || localError) && (
        <span className="venta-form__field-error" role="alert">{error || localError}</span>
      )}
    </div>
  )
}

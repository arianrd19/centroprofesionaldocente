import './ConfirmModal.css'

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) {
  if (!isOpen) return null

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-modal-icon ${type}`}>
          {type === 'warning' && '⚠️'}
          {type === 'danger' && '🗑️'}
          {type === 'info' && 'ℹ️'}
          {type === 'success' && '✅'}
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`btn-primary ${type === 'danger' ? 'btn-danger' : ''}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

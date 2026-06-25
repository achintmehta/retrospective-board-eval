import { useState } from 'react'

function AddCardForm({ onAdd }) {
  const [content, setContent] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (content.trim()) {
      onAdd(content.trim())
      setContent('')
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%', background: 'transparent', color: '#666',
          border: '1px dashed #ccc', padding: '8px 12px', fontSize: 13
        }}
      >
        + Add Card
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write something..."
        autoFocus
        rows={3}
        style={{ resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ background: '#4a90d9', color: '#fff', flex: 1 }}>
          Add
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setContent('') }}
          style={{ background: '#e0e0e0', color: '#333', flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default AddCardForm

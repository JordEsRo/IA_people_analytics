import React, { useState } from 'react'

// ApplyForm.jsx
// Props expected:
// - positionName: string (will be shown in header)
// - processCode: string (hidden)
// - processName: string (hidden)
// - driveFolderId: string (hidden)
// - submitUrl: string (backend endpoint to receive the form, e.g. /api/apply)

export default function ApplyForm({
  puesto = '',
  processCode = '',
  processName = '',
  driveFolderId = '',
  formToken = '',
  submitUrl = '/form/apply'
}) {
  const [firstName, setFirstName] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!firstName.trim()) e.firstName = 'Nombre es requerido'
    if (!documentId.trim()) e.documentId = 'Documento es requerido'
    if (!email.trim()) e.email = 'Correo es requerido'
    // basic email check
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Correo inválido'
    if (!cvFile) e.cvFile = 'Adjunta tu CV (PDF/DOC)'
    // file type and size checks
    if (cvFile) {
      const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowed.includes(cvFile.type)) e.cvFile = 'Formato de CV no permitido. Usa PDF o DOC/DOCX.'
      const maxBytes = 5 * 1024 * 1024 // 5 MB
      if (cvFile.size > maxBytes) e.cvFile = 'CV demasiado grande. Máx 5 MB.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setMessage(null)

    try {
      const form = new FormData()
      // visible fields
      form.append('name', firstName)
      form.append('dni', documentId)
      form.append('telf', phone)
      form.append('email', email)
      form.append('address', address)
      // hidden fields to link to the process
      form.append('puesto', puesto)
      form.append('process_code', processCode)
      form.append('process_name', processName)
      form.append('drive_folder_id', driveFolderId)
      form.append('form_token', formToken)
      // file
      form.append('cv', cvFile)

      const resp = await fetch(submitUrl, {
        method: 'POST',
        body: form
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Error en servidor' }))
        throw new Error(err.detail || 'Error en envío')
      }

      const data = await resp.json()
      setMessage(
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg">
          ✅ Postulación registrada
        </div>
      )
      // optionally clear fields
      setFirstName('')
      setDocumentId('')
      setPhone('')
      setEmail('')
      setAddress('')
      setCvFile(null)
      setErrors({})
    } catch (err) {
      console.error(err)
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-2">Postúlate: {puesto || 'Puesto'}</h2>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">
          <div className="text-sm">Nombres</div>
          <input className="w-full p-2 border rounded" value={firstName} onChange={e => setFirstName(e.target.value)} />
          {errors.firstName && <div className="text-red-600 text-sm">{errors.firstName}</div>}
        </label>

        <label className="block mb-2">
          <div className="text-sm">Documento de identidad</div>
          <input className="w-full p-2 border rounded" value={documentId} onChange={e => setDocumentId(e.target.value)} />
          {errors.documentId && <div className="text-red-600 text-sm">{errors.documentId}</div>}
        </label>

        <label className="block mb-2">
          <div className="text-sm">Teléfono</div>
          <input className="w-full p-2 border rounded" value={phone} onChange={e => setPhone(e.target.value)} />
        </label>

        <label className="block mb-2">
          <div className="text-sm">Correo</div>
          <input className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
          {errors.email && <div className="text-red-600 text-sm">{errors.email}</div>}
        </label>

        <label className="block mb-2">
          <div className="text-sm">Dirección</div>
          <input className="w-full p-2 border rounded" value={address} onChange={e => setAddress(e.target.value)} />
        </label>

        <label className="block mb-4">
          <div className="text-sm">Adjunta tu CV (PDF/DOC/DOCX) — Máx 5MB</div>
          <input type="file" accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files?.[0] || null)} />
          {errors.cvFile && <div className="text-red-600 text-sm">{errors.cvFile}</div>}
        </label>

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar postulación'}
          </button>
          <button type="button" className="px-4 py-2 rounded border" onClick={() => {
            setFirstName(''); setDocumentId(''); setPhone(''); setEmail(''); setAddress(''); setCvFile(null); setErrors({}); setMessage(null)
          }}>Limpiar</button>
        </div>

        {message && <div className="mt-4 text-sm">{message}</div>}
      </form>
    </div>
  )
}

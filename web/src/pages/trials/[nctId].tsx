// web/src/pages/trials/[nctId].tsx
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import TrialCard, { Trial as CardTrial } from '../../components/TrialCard'

export default function TrialDetailPage() {
  const router = useRouter()
  const { nctId } = router.query as { nctId?: string }

  const [trial, setTrial]     = useState<CardTrial | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!nctId) return
    setLoading(true)
    fetch(`/api/studies/${nctId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
        return res.json()
      })
      .then((data) => {
        const mapped: CardTrial = {
          nctId:         data.nctId,
          briefTitle:    data.briefTitle,
          // <-- New required field
          updated:       '',            // replace with real timestamp when available
          // the rest of your TrialCard fields:
          locations:     data.locations  || [],
          summary:       data.conditions?.join(', ') || '',
          badge:         undefined,
          status:        data.status      || '',
          phase:         data.phase       || [],
          ageRange:      data.ageRange    || { min: '', max: '' },
          keyEligibility: data.keyEligibility || {},
          enrollment:    data.enrollment,
        }
        setTrial(mapped)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => setLoading(false))
  }, [nctId])

  if (!nctId) return <p className="p-6">Invalid trial ID.</p>
  if (loading)  return <p className="p-6">Loading trial…</p>
  if (error)    return <p className="p-6 text-red-600">Error: {error}</p>
  if (!trial)   return <p className="p-6">No trial found.</p>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <TrialCard trial={trial} />
      {/* Add more details here as desired */}
    </div>
  )
}

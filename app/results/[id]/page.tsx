import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase'
import SpeciesCard from '@/components/results/SpeciesCard'
import TipsCard from '@/components/results/TipsCard'
import FlagCard from '@/components/results/FlagCard'
import SiteConditionsCard from '@/components/results/SiteConditionsCard'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { TreeSubmission } from '@/lib/types'

interface ResultsPageProps {
  params: { id: string }
}

async function getSubmission(id: string): Promise<TreeSubmission | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as TreeSubmission
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const submission = await getSubmission(params.id)
  if (!submission) notFound()

  const { ai_result: result } = submission

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Assessment Result</p>
          <h1 className="font-heading text-3xl text-green-dark">{submission.customer_name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {submission.property_address} &middot; {formatDate(submission.created_at)}
          </p>
        </div>
        <Badge variant={submission.status === 'pending' ? 'gray' : 'green'}>
          {submission.status}
        </Badge>
      </div>

      {submission.photo_urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {submission.photo_urls.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden">
              <Image src={url} alt={`Tree photo ${i + 1}`} fill className="object-cover" sizes="150px" />
            </div>
          ))}
        </div>
      )}

      {result ? (
        <>
          <SpeciesCard result={result} />
          <FlagCard flags={result.flags} />
          <TipsCard tips={result.crew_tips} />
          <SiteConditionsCard considerations={result.site_considerations} />
          <p className="text-xs text-gray-300 text-center">
            Analysis generated {formatDate(result.generated_at)}
          </p>
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">Analysis in progress…</p>
          <p className="text-sm mt-1">Refresh this page in a moment.</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <Link href="/submit">
          <Button variant="outline" size="sm">Submit Another Tree</Button>
        </Link>
      </div>
    </div>
  )
}

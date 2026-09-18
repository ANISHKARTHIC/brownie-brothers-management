import { ArrowLeft, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function ComingSoon({ title = 'Coming Soon' }: { title?: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-8 text-center">
      <div className="bg-[#f4e8d8] p-6 rounded-full mb-6 text-[#8b5a2b]">
        <Clock className="w-16 h-16" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-500 max-w-md mb-8">
        We're working hard to bring you this feature. Check back later for updates!
      </p>
      <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Go Back
      </Button>
    </div>
  )
}

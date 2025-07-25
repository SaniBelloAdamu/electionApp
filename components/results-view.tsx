"use client"

import { CardFooter } from "@/components/ui/card"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { supabaseOperations } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface CandidateResult {
  id: string
  name: string
  department: string
  image_url?: string
  vote_count: number
  percentage: number
}

interface Post {
  id: string
  title: string
  description: string
  election_id: string
}

interface ResultsViewProps {
  postId: string
}

export function ResultsView({ postId }: ResultsViewProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [results, setResults] = useState<{ candidates: CandidateResult[]; total_votes: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      try {
        // Fetch the specific post details
        const allPosts = await supabaseOperations.getPosts("") // Fetch all posts to find the specific one
        const currentPost = allPosts.find((p: Post) => p.id === postId)
        setPost(currentPost || null)

        // Fetch results for the specific post
        const data = await supabaseOperations.getPostResults(postId)
        setResults(data)
      } catch (error) {
        console.error("Error fetching results:", error)
        toast({
          title: "Error",
          description: "Failed to load election results.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [postId])

  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    )
  }

  if (!post) {
    return (
      <Card className="w-full max-w-md mx-auto text-center p-6">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <CardTitle className="text-2xl font-bold mb-2">Post Not Found</CardTitle>
        <CardDescription className="text-gray-600 mb-4">
          The results for this post are not available or the post does not exist.
        </CardDescription>
        <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl font-bold text-gray-800">{post.title} Results</CardTitle>
        <CardDescription className="text-gray-600">Total Votes: {results?.total_votes || 0}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-8">
        {results?.candidates && results.candidates.length > 0 ? (
          results.candidates.map((candidate) => (
            <div key={candidate.id} className="flex items-center gap-4">
              {candidate.image_url && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-200 shrink-0">
                  <Image
                    src={candidate.image_url || "/placeholder.svg"}
                    alt={candidate.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-lg font-semibold text-gray-800">{candidate.name}</h3>
                  <span className="text-lg font-bold text-emerald-600">{candidate.percentage.toFixed(2)}%</span>
                </div>
                <Progress value={candidate.percentage} className="h-3 bg-gray-200" />
                <p className="text-sm text-gray-500 mt-1">
                  {candidate.vote_count} votes ({candidate.department})
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground">No candidates or votes recorded for this post yet.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-center px-8 pb-8">
        <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </CardFooter>
    </Card>
  )
}

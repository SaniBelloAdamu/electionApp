"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { supabaseOperations } from "@/lib/supabase"
import type { User } from "@/lib/auth"
import type { PostWithRelations, Candidate } from "@/app/vote/[postId]/page" // Import types from the page

interface VotingInterfaceProps {
  post: PostWithRelations
  user: User
}

export function VotingInterface({ post, user }: VotingInterfaceProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [voteSuccessful, setVoteSuccessful] = useState(false)
  const router = useRouter()

  const handleVoteSubmit = async () => {
    if (!selectedCandidateId) return

    setIsLoading(true)
    setError("")

    try {
      // **SOLUTION PART 1: Proactive "Just-in-Time" Check**
      // Perform one final check right before submitting to prevent race conditions.
      const supabase = createClientComponentClient()
      const { data: voteCheck } = await supabase
        .from("votes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle()

      if (voteCheck) {
        // If a vote exists now, it means it was cast in another tab or via a double-click.
        // Show a friendly message and update the UI to the success state.
        setError("It looks like you've already voted for this position.")
        setVoteSuccessful(true) // Treat this as a success, as the vote is in.
        return;
      }

      // If the check passes, proceed to submit the vote.
      await supabaseOperations.submitVote({
        post_id: post.id,
        candidate_id: selectedCandidateId,
        user_id: user.id,
      })

      // Update local storage to immediately reflect the vote on the dashboard
      const userVotes = JSON.parse(localStorage.getItem("userVotes") || "{}")
      userVotes[post.id] = { candidate_id: selectedCandidateId }
      localStorage.setItem("userVotes", JSON.stringify(userVotes))

      // Set state to show the final success message
      setVoteSuccessful(true)

    } catch (err: any) {
      console.error("Vote submission error:", err)
      // **SOLUTION PART 2: Graceful Error Handling**
      // Specifically catch the "duplicate key" error from the database.
      if (err.code === '23505') { // This is the PostgreSQL code for unique_violation
          setError("Your vote has already been recorded for this position.")
          setVoteSuccessful(true); // Since the vote exists, we can consider this a "success"
      } else {
          setError(err.message || "An unexpected error occurred during vote submission.")
      }
    } finally {
        // We only set loading to false if an error occurred that wasn't a duplicate vote.
        // If it was a duplicate or successful, the component will unmount or show the success screen.
        if (!voteSuccessful) {
            setIsLoading(false)
        }
    }
  }

  const selectedCandidateData = post.candidates.find((c) => c.id === selectedCandidateId)

  // Final success screen after voting
  if (voteSuccessful) {
      return (
          <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
              <Card className="w-full max-w-md text-center p-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-bold mb-2">Vote Recorded!</CardTitle>
                  <CardDescription className="text-gray-600 mb-6">
                      Your vote for the "{post.title}" position has been successfully recorded.
                  </CardDescription>
                  <Button onClick={() => router.push('/dashboard')}>
                      Return to Dashboard
                  </Button>
              </Card>
          </div>
      )
  }

  // Confirmation screen
  if (showConfirmation && selectedCandidateData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Confirm Your Vote</CardTitle>
              <CardDescription className="text-center">Please review your selection before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Position: {post.title}</h3>
                <div className="flex items-center justify-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedCandidateData.image_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedCandidateData.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-semibold text-lg">{selectedCandidateData.name}</p>
                    {selectedCandidateData.department && (
                      <p className="text-gray-600">{selectedCandidateData.department}</p>
                    )}
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Once you submit your vote, it cannot be changed.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Go Back & Change
                </Button>
                <Button onClick={handleVoteSubmit} className="flex-1" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Final Vote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main selection screen
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
            <p className="text-gray-600 mb-4">{post.description}</p>
            {post.elections && (
              <Badge variant="secondary" className="text-sm">
                {post.elections.title}
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Select Your Candidate</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {post.candidates.map((candidate) => (
              <Card
                key={candidate.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCandidateId === candidate.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:border-gray-300"
                }`}
                onClick={() => setSelectedCandidateId(candidate.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={candidate.image_url || "/placeholder.svg"} />
                      <AvatarFallback>
                        {candidate.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{candidate.name}</h3>
                        {selectedCandidateId === candidate.id && <CheckCircle className="h-5 w-5 text-blue-600" />}
                      </div>
                      {candidate.department && <p className="text-gray-600 mb-2">{candidate.department}</p>}
                      {candidate.bio && <p className="text-sm text-gray-700 line-clamp-3">{candidate.bio}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <Button onClick={() => setShowConfirmation(true)} disabled={!selectedCandidateId} size="lg" className="px-8">
            Continue to Confirmation
          </Button>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { VotingInterface } from "@/components/voting-interface"
import { supabaseOperations } from "@/lib/supabase"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { authService, type User } from "@/lib/auth"
import type { PostgrestSingleResponse } from "@supabase/supabase-js"

// Define types for our data structures
export type Election = { id: string; title: string; end_time: string }
export type Candidate = { id: string; name: string; bio?: string; department?: string; image_url?: string }
export type PostWithRelations = { id: string; title: string; description: string; candidates: Candidate[]; elections: Election | null }

interface VotePageProps {
  params: { postId: string }
}

export default function VotePage({ params }: VotePageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [post, setPost] = useState<PostWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true)
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        router.push("/")
        return
      }
      setUser(currentUser)

      try {
        const supabase = createClientComponentClient()

        // **CRITICAL VOTE CHECK (The Page Guard)**
        // Before rendering the UI, verify the user's voting status from the database.
        const { data: voteCheck, error: voteCheckError } = await supabase
          .from("votes")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("post_id", params.postId)
          .maybeSingle()

        if (voteCheckError) {
          throw new Error("Database error: Could not verify your voting status.")
        }

        // **If a vote exists, the user has already voted. Redirect them immediately.**
        if (voteCheck) {
          toast({
            title: "Already Voted",
            description: "Redirecting you to the results for this position.",
          })
          router.replace(`/results/${params.postId}`) // Use `replace` to prevent using the 'back' button to return here
          return
        }

        // If the check passes (no vote found), proceed to fetch the page data.
        const { data: postData, error: postError }: PostgrestSingleResponse<PostWithRelations> = await supabase
          .from("posts").select("id, title, description, elections (id, title, end_time)").eq("id", params.postId).single()

        if (postError || !postData) throw new Error(postError?.message || "Post not found.")
        if (!postData.elections) throw new Error("Election data could not be found for this post.")
        
        const now = new Date()
        const endTime = new Date(postData.elections.end_time)
        if (now > endTime) {
          toast({ title: "Election Ended", description: "Voting for this position is now closed.", variant: "destructive" })
          router.push("/dashboard")
          return
        }

        const candidatesData = await supabaseOperations.getCandidates([params.postId])
        
        setPost({ ...postData, candidates: candidatesData || [] })

      } catch (error: any) {
        console.error("Error on vote page:", error)
        toast({ title: "Error Loading Page", description: error.message, variant: "destructive" })
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    initializePage()
  }, [params.postId, router, toast])

  // Display a loading spinner while the initial check is happening
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If loading is finished and we have a user and post, render the voting interface
  if (user && post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VotingInterface post={post} user={user} />
      </div>
    )
  }

  // Fallback case, though the logic above should prevent this
  return null
}
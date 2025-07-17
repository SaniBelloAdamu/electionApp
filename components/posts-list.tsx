"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { Users, CheckCircle, Clock, Vote, ArrowRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// Define the component's props and data structures
interface Post {
  id: string
  title: string
  description: string
  candidates: Array<{ id: string; name: string }>
  user_voted: boolean // This flag will control the UI
}

interface PostsListProps {
  userId: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function PostsList({ userId }: PostsListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    const fetchPostsAndUserVotes = async () => {
      if (!userId) {
        setLoading(false)
        return
      }
      
      try {
        const { data: elections, error: electionsError } = await supabase
          .from("elections")
          .select("id")
          .eq("is_active", true)
          .limit(1)

        if (electionsError) throw electionsError
        if (!elections || elections.length === 0) {
          setLoading(false)
          return
        }
        const electionId = elections[0].id

        // Fetch all necessary data in parallel for performance
        const [postsResponse, candidatesResponse, votesResponse] = await Promise.all([
          supabase.from("posts").select("*").eq("election_id", electionId).order("title"),
          supabase.from("candidates").select("id, name, post_id"),
          supabase.from("votes").select("post_id").eq("user_id", userId) // The critical database check
        ]);

        if (postsResponse.error) throw postsResponse.error;
        if (candidatesResponse.error) throw candidatesResponse.error;
        if (votesResponse.error) throw votesResponse.error;

        const electionPosts = postsResponse.data || [];
        const allCandidates = candidatesResponse.data || [];
        const userVotes = votesResponse.data || [];

        // Use a Set for efficient checking of which posts have been voted on
        const votedPostIds = new Set(userVotes.map((v) => v.post_id))

        const postsWithStatus = electionPosts.map((post) => {
          const candidatesForPost = allCandidates.filter((c) => c.post_id === post.id)
          const hasUserVoted = votedPostIds.has(post.id)

          return {
            ...post,
            candidates: candidatesForPost,
            user_voted: hasUserVoted,
          }
        })

        setPosts(postsWithStatus)
      } catch (error) {
        console.error("Error fetching posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPostsAndUserVotes()
  }, [userId, supabase])

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse"><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card><CardContent className="p-12 text-center"><Clock className="h-8 w-8 mx-auto mb-4 text-gray-400" /><h3 className="font-semibold">No Active Elections</h3><p className="text-sm text-gray-600">Please check back later.</p></CardContent></Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <Card key={post.id} className={`transition-all duration-300 ${post.user_voted ? "ring-2 ring-emerald-500 bg-emerald-50" : "hover:shadow-md"}`}>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="pr-2">
                <CardTitle className="text-lg font-bold">{post.title}</CardTitle>
                <CardDescription className="mt-1">{post.description}</CardDescription>
              </div>
              {post.user_voted && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 flex-shrink-0"><CheckCircle className="h-3 w-3 mr-1" />Voted</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
              <span className="flex items-center"><Users className="h-4 w-4 mr-1" />{post.candidates.length} candidates</span>
              <span className="flex items-center font-medium text-emerald-600"><Vote className="h-4 w-4 mr-1" />Active</span>
            </div>
            {/* Conditional rendering based on the user_voted flag */}
            {post.user_voted ? (
              <Link href={`/results/${post.id}`} passHref>
                <Button variant="outline" className="w-full">View Results <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            ) : (
              <Link href={`/vote/${post.id}`} passHref>
                <Button className="w-full bg-green-gradient text-white">Vote Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
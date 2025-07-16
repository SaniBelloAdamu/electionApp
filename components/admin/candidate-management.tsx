// components/CandidateManagement.tsx
"use client"

import { dataCache } from "@/lib/data-cache"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Edit, Trash2, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { OptimizedImageUpload } from "./optimized-image-upload"

interface Candidate {
  id: string
  name: string
  bio?: string
  department?: string
  post_id: string
  image_url?: string
  image_public_id?: string
}

interface Post {
  id: string
  title: string
  description?: string
}

export function CandidateManagement() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    department: "",
    post_id: "",
    image_url: "",
    image_public_id: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsInitialLoading(true)
      try {
        const { data: postsData } = await supabase.from("posts").select("id, title, description")
        const { data: candidatesData } = await supabase.from("candidates").select("*")

        if (postsData) setPosts(postsData)
        if (candidatesData) setCandidates(candidatesData)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load candidate data.",
          variant: "destructive",
        })
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleImageUpload = (result: any) => {
    setFormData((prev) => ({
      ...prev,
      image_url: result.url,
      image_public_id: result.publicId,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    const candidateData = {
      name: formData.name,
      bio: formData.bio,
      department: formData.department,
      post_id: formData.post_id,
      image_url: formData.image_url,
      image_public_id: formData.image_public_id,
    }

   const {
  data: userData,
  error: userError
} = await supabase.auth.getUser()

console.log("Current user:", userData?.user)

if (!userData?.user) {
  console.error("User is not authenticated!")
  toast({
    title: "Unauthorized",
    description: "You must be signed in to add a candidate.",
    variant: "destructive"
  })
  setLoading(false)
  return
}



    // Insert candidate into Supabase
    const { data, error } = await supabase
      .from("candidates")
      .insert([candidateData])

    if (error) {
      console.error("Error saving candidate:", error)
      throw error
    }

    // Add new candidate to state
    setCandidates((prev) => [...prev, ...(data || [])])
    setEditingCandidate(null)

    // Update cache
    dataCache.set(`candidates-1`, [...candidates, ...(data || [])], 60)

    // Reset form
    setFormData({
      name: "",
      bio: "",
      department: "",
      post_id: "",
      image_url: "",
      image_public_id: "",
    })
    setShowAddForm(false)
  } catch (error) {
    console.error("Error saving candidate:", error)
  } finally {
    setLoading(false)
  }
}


  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    setFormData({
      name: candidate.name,
      bio: candidate.bio || "",
      department: candidate.department || "",
      post_id: candidate.post_id,
      image_url: candidate.image_url || "",
      image_public_id: candidate.image_public_id || "",
    })
    setShowAddForm(true)
  }

  const handleDelete = async (candidateId: string) => {
    const { error } = await supabase.from("candidates").delete().eq("id", candidateId)
    if (!error) {
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId))
    }
  }

  const getPostTitle = (postId: string) => posts.find((p) => p.id === postId)?.title || "Unknown"

  if (isInitialLoading) return <CandidateManagementSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Candidate Management</h2>
          <p className="text-gray-600">Add, edit, and manage election candidates</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Candidate
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCandidate ? "Edit Candidate" : "Add New Candidate"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                </div>
              </div>

              <OptimizedImageUpload value={formData.image_url} publicId={formData.image_public_id} onChange={handleImageUpload} label="Candidate Photo" maxSize={5} />

              <div>
                <Label htmlFor="post">Position</Label>
                <Select value={formData.post_id} onValueChange={(value) => setFormData({ ...formData, post_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent>
                    {posts.map((post) => (
                      <SelectItem key={post.id} value={post.id}>{post.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bio">Biography/Manifesto</Label>
                <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={4} />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : editingCandidate ? "Update" : "Add Candidate"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowAddForm(false); setEditingCandidate(null); setFormData({ name: "", bio: "", department: "", post_id: "", image_url: "", image_public_id: "" }) }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {posts.map((post) => {
          const postCandidates = candidates.filter((c) => c.post_id === post.id)

          return (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{post.title}</span>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" /> {postCandidates.length} candidates
                  </Badge>
                </CardTitle>
                <CardDescription>{post.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {postCandidates.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No candidates added yet</p>
                ) : (
                  <div className="space-y-4">
                    {postCandidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={candidate.image_url || "/placeholder.svg"} loading="lazy" />
                          <AvatarFallback>
                            {candidate.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{candidate.name}</h4>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(candidate)}><Edit className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(candidate.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          {candidate.department && <p className="text-sm text-gray-600 mb-2">{candidate.department}</p>}
                          {candidate.bio && <p className="text-sm text-gray-700">{candidate.bio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function CandidateManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

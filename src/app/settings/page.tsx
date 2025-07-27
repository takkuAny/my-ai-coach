'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

export default function SettingsPage() {
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState({
    name: '',
    avatar_url: '',
    theme: 'system',
  })
  const [apiKey, setApiKey] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(false)

  // Load user profile and API key
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url, theme')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setAvatarPreview(profileData.avatar_url)
      }

      const { data: keyData } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (keyData) setApiKey(keyData.api_key)
    }

    load()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    let avatar_url = profile.avatar_url

    if (avatarFile && userId) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `${userId}/avatar.${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        })

      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatar_url = data.publicUrl
        setAvatarPreview(avatar_url)
      } else {
        console.error('Upload error:', error)
      }
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({
        name: profile.name,
        avatar_url,
        theme: profile.theme,
      })
      .eq('id', userId)

    // Upsert API key
    if (apiKey) {
      await supabase
        .from('api_keys')
        .upsert({
          user_id: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        }, { onConflict: 'user_id' })
    }

    setLoading(false)
    alert('Settings saved successfully.')
  }

  const handleFileChange = (file: File | null) => {
    setAvatarFile(file)
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setAvatarPreview(previewUrl)
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Settings</h1>

      {/* Name */}
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <Label>Profile Image</Label>
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="Preview"
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Settings'}
      </Button>
    </main>
  )
}

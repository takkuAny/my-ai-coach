'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select'
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

  // プロフィール読み込み
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
        console.error('Upload error:', error)
        console.log('userId:', userId)
        console.log('✅ avatarPreview URL:', avatar_url)
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatar_url = data.publicUrl
        console.log('✅ avatarPreview URL:', avatar_url)
        setAvatarPreview(avatar_url)
      }
    }

    // profiles更新
    await supabase
      .from('profiles')
      .update({
        name: profile.name,
        avatar_url,
        theme: profile.theme,
      })
      .eq('id', userId)

    // api_keys upsert
    if (apiKey) {
      await supabase
        .from('api_keys')
        .upsert({
          user_id: userId,
          api_key: apiKey,
          provider: 'OpenAI',
          updated_at: new Date().toISOString(),
          updated_by: userId,
        }, { onConflict: 'user_id' })
    }

    setLoading(false)
    alert('保存しました')
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
      <h1 className="text-2xl font-bold">⚙️ 設定</h1>

      {/* 名前 */}
      <div className="space-y-2">
        <Label>名前</Label>
        <Input
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
      </div>

      {/* プロフィール画像 */}
      <div className="space-y-2">
        <Label>プロフィール画像</Label>
        {avatarPreview && (
          <img
            src={avatarPreview}
            alt="preview"
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

      {/* テーマ */}
      <div className="space-y-2">
        <Label>テーマ</Label>
        <Select
          value={profile.theme}
          onValueChange={(v) => setProfile({ ...profile, theme: v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="テーマ選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">システム</SelectItem>
            <SelectItem value="light">ライト</SelectItem>
            <SelectItem value="dark">ダーク</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* APIキー */}
      <div className="space-y-2">
        <Label>APIキー（OpenAI）</Label>
        <Input
          type="password"
          value={apiKey}
          placeholder="sk-..."
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? '保存中...' : '保存する'}
      </Button>
    </main>
  )
}

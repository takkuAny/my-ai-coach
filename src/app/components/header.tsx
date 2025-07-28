"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Image from "next/image";

export function Header() {
  const supabaseClient = supabase;
  const router = useRouter();
  useTheme();

  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserName(profile.name);
      setAvatarUrl(profile.avatar_url);
    }
  };

  useEffect(() => {
    fetchProfile();

    // 🔄 Listen to profile update events
    const handleProfileUpdated = () => {
      fetchProfile(); // 再フェッチ
    };

    window.addEventListener("profileUpdated", handleProfileUpdated);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdated);
    };
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push("/signin");
  };

  return (
    <header className="flex justify-between items-center p-4 bg-muted">
      <div className="text-xl font-bold">📘 Learning AI Coach</div>
      <div className="flex items-center gap-4">
        {avatarUrl && (
          <Image
            src={avatarUrl}
            alt="avatar"
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        {userName && <span className="text-sm font-medium">{userName}</span>}

        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}

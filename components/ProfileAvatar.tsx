import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Props = {
  size?: number;
};

export default function ProfileAvatar({ size = 40 }: Props) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState('👤');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
        if (profile.full_name) {
          const names = profile.full_name.split(' ');
          const init = names.map((n: string) => n.charAt(0)).slice(0, 2).join('').toUpperCase();
          setInitials(init || '👤');
        }
      }
    } catch (error) {
      console.error('Error loading profile for avatar:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={() => router.push('/profile')}
    >
      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: 'bold',
    color: '#0891b2',
  },
});


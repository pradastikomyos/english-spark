import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userId: string | null;
  role: 'admin' | 'teacher' | 'student' | null;
  profileId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | 'student' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.assign('/');
  }, [queryClient]);

  useEffect(() => {
    const fetchUserProfile = async (user: User | null) => {
      if (!user) {
        setRole(null);
        setProfileId(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, profile_id')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setRole(data?.role as 'admin' | 'teacher' | 'student' || null);
        setProfileId(data?.profile_id || null);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setRole(null);
        setProfileId(null);
      }
    };

    // onAuthStateChange fires immediately with the current session,
    // so it handles both initial load and subsequent changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Unblock the UI immediately once the session is known.
      setLoading(false); 
      // Fetch the user's profile and role in the background.
      fetchUserProfile(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true); // Set loading to true when sign-in starts
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // On success, onAuthStateChange will handle setting loading to false.
    } catch (error: any) {
      toast({
        title: 'Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false); // On failure, we must manually set loading to false.
    }
  };

  const value = { session, user, userId: user?.id || null, role, profileId, loading, signIn, signOut };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div>Loading...</div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

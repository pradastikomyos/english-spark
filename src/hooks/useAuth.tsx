
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'student' | 'teacher' | 'admin';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  userRole: UserRole | null; // Added for compatibility
  profileId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // This function fetches the user's role from the database.
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, profile_id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setRole(data.role as UserRole);
        setProfileId(data.profile_id);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
      setProfileId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);

    const handleSession = async (session: import('@supabase/supabase-js').Session | null) => {
      if (session && session.user) {
        // Check if the user is the same to avoid redundant fetches
        if (user?.id !== session.user.id) {
          setUser(session.user);
          await fetchUserRole(session.user.id);
        }
      } else {
        setUser(null);
        setRole(null);
        setProfileId(null);
      }
      setLoading(false);
    };

    // 1. Check the initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session on initial load:', error.message);
        // If the refresh token is invalid, force a sign out to clear everything.
        supabase.auth.signOut();
        handleSession(null);
      } else {
        handleSession(session);
      }
    });

    // 2. Set up a listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Signed in successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Signed out successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        userRole: role, // Added for compatibility
        profileId,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

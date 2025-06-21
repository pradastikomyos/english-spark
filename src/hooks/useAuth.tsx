
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  profileId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);        if (session?.user) {
          // Fetch user role and profile ID with optimized query
          try {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role, profile_id')
              .eq('user_id', session.user.id)
              .single();
            
            if (roleData && !roleError) {
              setUserRole(roleData.role);
              setProfileId(roleData.profile_id);
            } else {
              // If no role found, user might be newly created
              console.log('No role found for user, might need profile setup');
              setUserRole(null);
              setProfileId(null);
            }
            setLoading(false);
          } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRole(null);
            setProfileId(null);
            setLoading(false);
          }
        } else {
          setUserRole(null);
          setProfileId(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };
  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) return { error };

      // If user is created successfully and we have user data
      if (data.user && userData.name) {
        // Create student profile automatically
        try {
          const studentData = {
            id: data.user.id,
            user_id: data.user.id,
            name: userData.name,
            email: email,
            student_id: `STD${Date.now()}`, // Generate unique student ID
            class_id: null, // Will be assigned by teacher later
            total_points: 0,
            level: 1,
            current_streak: 0,
          };

          const { error: studentError } = await supabase
            .from('students')
            .insert(studentData);

          if (studentError) {
            console.error('Error creating student profile:', studentError);
          } else {
            // Create user role entry
            await supabase
              .from('user_roles')
              .insert({
                user_id: data.user.id,
                role: 'student',
                profile_id: data.user.id,
              });
          }
        } catch (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        profileId,
        loading,
        signIn,
        signUp,
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

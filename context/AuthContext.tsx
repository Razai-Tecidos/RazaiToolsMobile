import React, { createContext, useContext, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type UserRole = 'admin' | 'collaborator' | null

interface AuthContextType {
  session: Session | null
  user: User | null
  role: UserRole
  loading: boolean
  signIn: (email: string, pass: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signIn: async () => ({ error: 'Not implemented' }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const handleAuthState = async (session: Session | null) => {
      if (!mounted) return

      let userRole: UserRole = 'collaborator'

      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (profile?.role) {
            userRole = profile.role as UserRole
          }
        } catch (error) {
          console.error('Erro ao buscar perfil:', error)
        }
      }

      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        setRole(userRole)
        setLoading(false)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.log('Erro de sessão (recuperável):', error.message)
          handleAuthState(null)
        } else {
          handleAuthState(session)
        }
      })
      .catch((error) => {
        console.log('Falha crítica ao inicializar sessão:', error)
        if (mounted) {
          handleAuthState(null)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESH_REVOKED' || event === 'SIGNED_OUT') {
        handleAuthState(null)
      } else {
        handleAuthState(session)
      }
    })

    // Monitorar AppState para renovar token ao voltar para o app
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      appStateListener.remove()
    }
  }, [])

  const signIn = async (username: string, pass: string) => {
    let emailToUse = username
    
    // Se não parece um email, buscar o email pelo username
    if (!username.includes('@')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single()
      
      if (profileError || !profile) {
        return { data: null, error: { message: 'Usuário não encontrado' } }
      }
      
      // Usar o padrão: username@razai.local
      emailToUse = `${username.toLowerCase()}@razai.local`
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: pass,
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

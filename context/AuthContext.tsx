import React, { createContext, useContext, useEffect, useState } from 'react'
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

    const applySession = (sessionValue: Session | null) => {
      if (!mounted) return
      setSession(sessionValue)
      setUser(sessionValue?.user ?? null)
    }

    const loadRoleForSession = async (sessionValue: Session | null) => {
      if (!mounted) return

      if (!sessionValue?.user?.id) {
        setRole(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionValue.user.id)
          .single()

        if (!mounted) return
        if (error) {
          console.error('Falha ao carregar role do usuário', error)
          setRole('collaborator')
        } else {
          setRole((data?.role as UserRole) ?? 'collaborator')
        }
      } catch (err) {
        if (mounted) {
          console.error('Erro inesperado ao carregar role', err)
          setRole('collaborator')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const handleAuthState = (sessionValue: Session | null) => {
      applySession(sessionValue)
      loadRoleForSession(sessionValue)
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        handleAuthState(session)
      })
      .catch((error) => {
        console.error('Falha ao inicializar sessão', error)
        handleAuthState(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sessionValue) => {
      handleAuthState(sessionValue)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
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
    setSession(null)
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

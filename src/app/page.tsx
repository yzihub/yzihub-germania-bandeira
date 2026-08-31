"use client"

import { useEffect, useState } from "react"

import { Mark } from "@/components/Mark"
import { supabase } from "@/lib/supabase/client"

const STORAGE_KEY = "germania_discovery_session"

type StoredSession = {
  sessionId: string
  resumeToken: string
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const rawSession = localStorage.getItem(STORAGE_KEY)

        if (!rawSession) {
          setHasSession(false)
          return
        }

        const storedSession = JSON.parse(rawSession) as StoredSession

        if (!storedSession.sessionId || !storedSession.resumeToken) {
          localStorage.removeItem(STORAGE_KEY)
          setHasSession(false)
          return
        }

        const { data, error } = await supabase.rpc(
          "get_discovery_session",
          {
            p_session_id: storedSession.sessionId,
            p_resume_token: storedSession.resumeToken,
          }
        )

        if (error || !data?.session) {
          localStorage.removeItem(STORAGE_KEY)
          setHasSession(false)
          return
        }

        setHasSession(data.session.status !== "completed")
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        setHasSession(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkExistingSession()
  }, [])

  async function handleDiscovery() {
    try {
      setLoading(true)
      setError(null)

      const rawSession = localStorage.getItem(STORAGE_KEY)

      if (rawSession) {
        const storedSession = JSON.parse(rawSession) as StoredSession

        const { data, error } = await supabase.rpc(
          "get_discovery_session",
          {
            p_session_id: storedSession.sessionId,
            p_resume_token: storedSession.resumeToken,
          }
        )

        if (!error && data?.session?.status !== "completed") {
          window.location.href = "/discovery"
          return
        }

        localStorage.removeItem(STORAGE_KEY)
      }

      const { data, error } = await supabase.rpc(
        "start_discovery_session",
        {
          p_project_slug: "germania-bandeira",
          p_respondent_name: null,
          p_respondent_email: null,
        }
      )

      if (error) throw error

      if (!data?.session_id || !data?.resume_token) {
        throw new Error("Não foi possível iniciar sua sessão.")
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId: data.session_id,
          resumeToken: data.resume_token,
        })
      )

      window.location.href = "/discovery"
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível continuar agora."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[100svh] bg-paper text-ink">
      <section className="shell">
        <header className="t-eyebrow">Dra. Germânia Bandeira</header>

        {/* The opening is a cover: air above, the block settling low on wide
            screens, the footer holding the base line. */}
        <div className="flex flex-1 flex-col justify-center py-[var(--space-3)] sm:py-[var(--space-5)]">
          <div>
            <Mark className="rise" />

            <p className="t-eyebrow rise rise-delay-1 mt-[var(--space-3)]">
              Discovery
            </p>

            <h1 className="t-display rise rise-delay-1 mt-[var(--space-3)] md:mt-[var(--space-4)]">
              Primeiro, precisamos encontrar o que é essencial.
            </h1>

            <p className="t-body rise rise-delay-2 mt-[var(--space-4)] sm:mt-[var(--space-5)]">
              Estas perguntas foram pensadas para revelar o que deve orientar
              o projeto — da sua trajetória à forma como você cuida, comunica
              e deseja construir sua presença no digital.
            </p>

            <div className="rise rise-delay-3 mt-[var(--space-4)] sm:mt-[var(--space-5)]">
              <button
                onClick={handleDiscovery}
                disabled={loading || checkingSession}
                className="btn-ink"
              >
                {checkingSession
                  ? "Preparando..."
                  : loading
                    ? "Abrindo..."
                    : hasSession
                      ? "Continuar de onde parei"
                      : "Começar"}
              </button>

              <p className="t-note mt-[var(--space-3)] max-w-[var(--measure-note)]">
                Pode sair quando quiser. Suas respostas ficam salvas e você
                continua daqui quando voltar.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-[var(--space-3)] max-w-[46ch] text-sm leading-6 text-danger"
              >
                {error}
              </p>
            )}
          </div>
        </div>

        <footer className="flex flex-col gap-1 border-t border-ink-10 pt-[var(--space-3)] sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <span className="t-eyebrow">YZIHUB</span>
          <span className="t-note">
            Discovery estratégico · Dra. Germânia Bandeira
          </span>
        </footer>
      </section>
    </main>
  )
}

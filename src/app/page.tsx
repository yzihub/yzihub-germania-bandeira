"use client"

import { useEffect, useState } from "react"

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
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#1f1f1f]">
      <section className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-between px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:px-12">
        <header className="flex items-center justify-between gap-6">
          <div className="text-[11px] uppercase tracking-[0.16em] sm:text-xs md:text-sm">
            Dra. Germânia Bandeira
          </div>

          <div className="text-[10px] uppercase tracking-[0.14em] text-black/45 sm:text-xs">
            Discovery
          </div>
        </header>

        <div className="max-w-4xl py-12 sm:py-16 md:py-20 lg:py-24">
          <p className="rise mb-4 text-[11px] uppercase tracking-[0.18em] text-black/45 sm:mb-5 sm:text-xs">
            Projeto digital
          </p>

          <h1 className="rise rise-delay-1 max-w-[19ch] text-[2.05rem] font-medium leading-[1.08] tracking-[-0.035em] break-words hyphens-auto sm:text-[2.9rem] sm:leading-[1.02] sm:tracking-[-0.042em] md:text-[3.5rem] lg:text-[4rem] xl:text-[4.3rem]">
            Antes de construir o site,
            <br className="hidden sm:block" />
            precisamos entender
            <br className="hidden sm:block" />
            o que ele deve representar.
          </h1>

          <div className="rise rise-delay-2 mt-8 md:mt-9">
            <p className="max-w-[54ch] text-base leading-8 text-black/60 sm:text-lg">
              Esta etapa vai nos ajudar a compreender sua trajetória,
              sua forma de cuidar, seus pacientes e o que você deseja
              construir daqui para frente.
            </p>

            <div className="mt-9 flex flex-col gap-5 sm:mt-10 sm:flex-row sm:items-center sm:gap-7">
              <button
                onClick={handleDiscovery}
                disabled={loading || checkingSession}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#1f1f1f] px-8 text-[0.95rem] font-medium text-[#f4f0ea] transition-colors duration-300 hover:bg-black active:bg-black/85 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:w-auto sm:text-sm"
              >
                {checkingSession
                  ? "Preparando..."
                  : loading
                    ? "Abrindo..."
                    : hasSession
                      ? "Continuar de onde parei"
                      : "Começar"}
              </button>

              <span className="max-w-[38ch] text-[0.9rem] leading-6 text-black/45">
                Pode sair quando quiser. Suas respostas ficam salvas e você
                continua daqui quando voltar.
              </span>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-6 max-w-xl text-sm leading-6 text-[#8a2f2f]"
              >
                {error}
              </p>
            )}
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-black/10 pt-5 text-[11px] text-black/40 sm:text-xs md:flex-row md:items-center md:justify-between">
          <span>YZIHUB</span>
          <span>Discovery estratégico · Dra. Germânia Bandeira</span>
        </footer>
      </section>
    </main>
  )
}
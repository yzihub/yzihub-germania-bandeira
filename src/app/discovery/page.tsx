"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"

type Question = {
  id: string
  section_key: string
  question_key: string
  position: number
  question_type:
    | "short_text"
    | "long_text"
    | "single_select"
    | "multi_select"
    | "boolean"
    | "number"
    | "date"
    | "url"
    | "email"
    | "upload"
  prompt: string
  help_text: string | null
  required: boolean
  options: string[]
  conditions: unknown
  metadata: Record<string, unknown>
}

type ChapterIntro = {
  title: string
  intro: string
}

type DiscoveryTemplate = {
  project: {
    id: string
    slug: string
    name: string
    template_key: string
    template_version: number
    metadata?: {
      chapter_intros?: Record<string, ChapterIntro>
    }
  }
  questions: Question[]
}

type StoredSession = {
  sessionId: string
  resumeToken: string
}

type SavedAnswer = {
  question_id: string
  question_key: string
  value: unknown
  answered_at: string
}

type SessionResponse = {
  session: {
    id: string
    status: string
    current_section_key: string | null
    current_question_key: string | null
    progress_percent: number
  }
  answers: SavedAnswer[]
}

export default function DiscoveryPage() {
  const [template, setTemplate] = useState<DiscoveryTemplate | null>(null)
  const [session, setSession] = useState<StoredSession | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showChapterIntro, setShowChapterIntro] = useState(true)

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [draftValue, setDraftValue] = useState<unknown>("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const rawSession = localStorage.getItem(
          "germania_discovery_session"
        )

        if (!rawSession) {
          window.location.href = "/"
          return
        }

        const storedSession = JSON.parse(rawSession) as StoredSession

        setSession(storedSession)

        const [templateResult, sessionResult] = await Promise.all([
          supabase.rpc("get_discovery_template", {
            p_project_slug: "germania-bandeira",
          }),

          supabase.rpc("get_discovery_session", {
            p_session_id: storedSession.sessionId,
            p_resume_token: storedSession.resumeToken,
          }),
        ])

        if (templateResult.error) throw templateResult.error
        if (sessionResult.error) throw sessionResult.error

        const loadedTemplate =
          templateResult.data as DiscoveryTemplate

        const loadedSession =
          sessionResult.data as SessionResponse

        setTemplate(loadedTemplate)

        const restoredAnswers: Record<string, unknown> = {}

        for (const answer of loadedSession.answers ?? []) {
          restoredAnswers[answer.question_key] = answer.value
        }

        setAnswers(restoredAnswers)

        if (loadedSession.session.status === "completed") {
          setFinished(true)
          return
        }

        const lastQuestionKey =
          loadedSession.session.current_question_key

        if (lastQuestionKey) {
          const lastIndex = loadedTemplate.questions.findIndex(
            (question) =>
              question.question_key === lastQuestionKey
          )

          if (
            lastIndex >= 0 &&
            lastIndex < loadedTemplate.questions.length - 1
          ) {
            const nextIndex = lastIndex + 1
            setCurrentIndex(nextIndex)

            const previousSection =
              loadedTemplate.questions[lastIndex]?.section_key

            const nextSection =
              loadedTemplate.questions[nextIndex]?.section_key

            setShowChapterIntro(
              previousSection !== nextSection
            )

            return
          }
        }

        setCurrentIndex(0)
        setShowChapterIntro(true)
      } catch (err) {
        console.error(err)

        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar suas respostas."
        )
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const questions = template?.questions ?? []
  const currentQuestion = questions[currentIndex]

  const chapter = useMemo(() => {
    if (!template || !currentQuestion) return null

    return (
      template.project.metadata?.chapter_intros?.[
        currentQuestion.section_key
      ] ?? null
    )
  }, [template, currentQuestion])

  useEffect(() => {
    if (!currentQuestion) return

    const previousValue =
      answers[currentQuestion.question_key]

    if (previousValue !== undefined) {
      setDraftValue(previousValue)
      return
    }

    if (currentQuestion.question_type === "multi_select") {
      setDraftValue([])
      return
    }

    setDraftValue("")
  }, [currentQuestion, answers])

  const progress =
    questions.length > 0
      ? Math.round(
          ((currentIndex + (showChapterIntro ? 0 : 1)) /
            questions.length) *
            100
        )
      : 0

  function hasValidAnswer() {
    if (!currentQuestion) return false

    if (!currentQuestion.required) return true

    if (Array.isArray(draftValue)) {
      return draftValue.length > 0
    }

    if (typeof draftValue === "boolean") {
      return true
    }

    return String(draftValue ?? "").trim().length > 0
  }

  async function saveAndContinue() {
    if (!currentQuestion || !session) return

    if (!hasValidAnswer()) {
      setError("Antes de continuar, responda esta pergunta.")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase.rpc(
        "save_discovery_answer",
        {
          p_session_id: session.sessionId,
          p_resume_token: session.resumeToken,
          p_question_key: currentQuestion.question_key,
          p_value: draftValue,
        }
      )

      if (error) throw error

      setAnswers((current) => ({
        ...current,
        [currentQuestion.question_key]: draftValue,
      }))

      const isLastQuestion =
        currentIndex === questions.length - 1

      if (isLastQuestion) {
        const { error: completeError } = await supabase.rpc(
          "complete_discovery_session",
          {
            p_session_id: session.sessionId,
            p_resume_token: session.resumeToken,
          }
        )

        if (completeError) throw completeError

        setFinished(true)
        return
      }

      const nextIndex = currentIndex + 1

      const nextQuestion = questions[nextIndex]

      const changesChapter =
        nextQuestion.section_key !==
        currentQuestion.section_key

      setCurrentIndex(nextIndex)
      setShowChapterIntro(changesChapter)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar sua resposta."
      )
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    setError(null)

    if (showChapterIntro) {
      if (currentIndex === 0) {
        window.location.href = "/"
        return
      }

      setShowChapterIntro(false)
      setCurrentIndex((current) =>
        Math.max(0, current - 1)
      )

      return
    }

    if (currentIndex === 0) {
      setShowChapterIntro(true)
      return
    }

    const currentSection =
      questions[currentIndex]?.section_key

    const previousIndex = currentIndex - 1
    const previousSection =
      questions[previousIndex]?.section_key

    setCurrentIndex(previousIndex)

    if (currentSection !== previousSection) {
      setShowChapterIntro(false)
    }
  }

  function toggleOption(option: string) {
    const current = Array.isArray(draftValue)
      ? (draftValue as string[])
      : []

    if (current.includes(option)) {
      setDraftValue(
        current.filter((item) => item !== option)
      )
      return
    }

    setDraftValue([...current, option])
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0ea]">
        <p className="rise text-[11px] uppercase tracking-[0.2em] text-black/40">
          Preparando tudo para você...
        </p>
      </main>
    )
  }

  if (finished) {
    return (
      <main className="min-h-[100svh] bg-[#f4f0ea] text-[#1f1f1f]">
        <section className={SHELL}>
          <header className="flex items-center justify-between gap-6 border-b border-black/10 pb-5">
            <span className="text-[11px] uppercase tracking-[0.16em] sm:text-xs md:text-sm">
              Dra. Germânia Bandeira
            </span>

            <span className="text-[10px] uppercase tracking-[0.14em] text-black/40 sm:text-xs">
              Concluído
            </span>
          </header>

          <div className="flex flex-1 items-center py-16">
            <div className="w-full max-w-3xl">
              <p className="rise text-[11px] uppercase tracking-[0.2em] text-black/40">
                Obrigado
              </p>

              <h1 className="rise rise-delay-1 mt-6 max-w-[15ch] text-[2.05rem] font-medium leading-[1.06] tracking-[-0.035em] break-words hyphens-auto sm:text-[2.9rem] sm:leading-[1.02] sm:tracking-[-0.04em] md:text-[3.5rem] lg:text-[4rem]">
                Agora temos uma base muito mais clara para começar.
              </h1>

              <div className="rise rise-delay-2 mt-9">
                <p className="max-w-[54ch] text-base leading-8 text-black/55 sm:text-lg">
                  Suas respostas vão nos ajudar a transformar sua
                  história, sua forma de cuidar e seus objetivos em um
                  projeto que realmente represente você.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (error && !template) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0ea] px-6">
        <p
          role="alert"
          className="max-w-xl text-center text-sm leading-6 text-[#8a2f2f]"
        >
          {error}
        </p>
      </main>
    )
  }

  if (!template || !currentQuestion) {
    return null
  }

  if (showChapterIntro) {
    return (
      <main className="min-h-[100svh] bg-[#f4f0ea] text-[#1f1f1f]">
        <section className={SHELL}>
          <Header
            progress={progress}
            current={currentIndex + 1}
            total={questions.length}
          />

          <div
            key={currentQuestion.section_key}
            className="flex flex-1 items-center py-16 sm:py-20"
          >
            <div className="w-full max-w-3xl">
              <p className="rise text-[11px] uppercase tracking-[0.2em] text-black/40">
                Próximo capítulo
              </p>

              <h1 className="rise rise-delay-1 mt-6 max-w-[16ch] text-[2.05rem] font-medium leading-[1.06] tracking-[-0.035em] break-words hyphens-auto sm:text-[2.9rem] sm:leading-[1.02] sm:tracking-[-0.04em] md:text-[3.5rem] lg:text-[4rem]">
                {chapter?.title ?? "Vamos continuar"}
              </h1>

              <div className="rise rise-delay-2 mt-9">
                <p className="max-w-[54ch] text-base leading-8 text-black/55 sm:text-lg">
                  {chapter?.intro ??
                    "As próximas perguntas vão nos ajudar a conhecer melhor você e o seu projeto."}
                </p>

                <button
                  onClick={() => setShowChapterIntro(false)}
                  className={PRIMARY_BUTTON + " mt-10"}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#1f1f1f]">
      <section className={SHELL}>
        <Header
          progress={progress}
          current={currentIndex + 1}
          total={questions.length}
        />

        <div className="flex flex-1 items-center py-8 sm:py-10 lg:py-12">
          <div
            key={currentQuestion.id}
            className="rise w-full max-w-3xl"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/40">
              {chapter?.title ?? "Discovery"}
            </p>

            <h1 className="mt-4 max-w-[22ch] text-[1.6rem] font-medium leading-[1.16] tracking-[-0.028em] break-words hyphens-auto sm:mt-5 sm:text-[2.1rem] sm:tracking-[-0.032em] md:text-[2.5rem] lg:text-[2.9rem]">
              {currentQuestion.prompt}
            </h1>

            {currentQuestion.help_text && (
              <p className="mt-5 max-w-[52ch] text-[0.95rem] leading-7 text-black/45 sm:text-base">
                {currentQuestion.help_text}
              </p>
            )}

            <div className="mt-7 sm:mt-8">
              <QuestionField
                question={currentQuestion}
                value={draftValue}
                setValue={setDraftValue}
                toggleOption={toggleOption}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-5 text-sm leading-6 text-[#8a2f2f]"
              >
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-col-reverse items-stretch gap-2 sm:mt-9 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <button
                onClick={goBack}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center self-stretch px-2 text-sm text-black/45 underline-offset-[6px] transition-colors duration-300 hover:text-black hover:underline disabled:opacity-40 sm:min-h-0 sm:self-auto sm:px-0"
              >
                Voltar
              </button>

              <button
                onClick={saveAndContinue}
                disabled={saving}
                className={PRIMARY_BUTTON}
              >
                {saving
                  ? "Salvando..."
                  : currentIndex === questions.length - 1
                    ? "Finalizar"
                    : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

const SHELL =
  "mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:px-12"

const PRIMARY_BUTTON =
  "inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#1f1f1f] px-8 text-[0.95rem] font-medium text-[#f4f0ea] transition-colors duration-300 hover:bg-black active:bg-black/85 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:w-auto sm:text-sm"

function Header({
  progress,
  current,
  total,
}: {
  progress: number
  current: number
  total: number
}) {
  return (
    <header>
      <div className="flex items-center justify-between gap-6 pb-4">
        <span className="text-[11px] uppercase tracking-[0.16em] sm:text-xs md:text-sm">
          Dra. Germânia Bandeira
        </span>

        <span className="text-[10px] uppercase tracking-[0.14em] tabular-nums text-black/40 sm:text-xs">
          <span className="text-black/70">{current}</span>
          <span className="mx-1.5 text-black/25">/</span>
          {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do discovery"
        className="h-px w-full bg-black/10"
      >
        <div
          className="h-px bg-[#9a6a4f] transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(1, progress)}%`,
          }}
        />
      </div>
    </header>
  )
}

function QuestionField({
  question,
  value,
  setValue,
  toggleOption,
}: {
  question: Question
  value: unknown
  setValue: (value: unknown) => void
  toggleOption: (option: string) => void
}) {
  if (question.question_type === "long_text") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(event) =>
          setValue(event.target.value)
        }
        placeholder="Escreva com suas palavras..."
        rows={4}
        className={`${FIELD} resize-none text-[1.0625rem] leading-8 sm:text-lg`}
      />
    )
  }

  if (
    question.question_type === "short_text" ||
    question.question_type === "url" ||
    question.question_type === "email"
  ) {
    return (
      <input
        type={
          question.question_type === "email"
            ? "email"
            : question.question_type === "url"
              ? "url"
              : "text"
        }
        value={typeof value === "string" ? value : ""}
        onChange={(event) =>
          setValue(event.target.value)
        }
        placeholder="Escreva aqui..."
        className={`${FIELD} text-lg leading-8 sm:text-xl`}
      />
    )
  }

  if (question.question_type === "single_select") {
    return (
      <div className="grid gap-2.5">
        {question.options.map((option) => (
          <OptionCard
            key={option}
            label={option}
            selected={value === option}
            marker="round"
            onClick={() => setValue(option)}
          />
        ))}
      </div>
    )
  }

  if (question.question_type === "multi_select") {
    const selectedValues = Array.isArray(value)
      ? (value as string[])
      : []

    return (
      <div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.options.map((option) => (
            <OptionCard
              key={option}
              label={option}
              selected={selectedValues.includes(option)}
              marker="square"
              onClick={() => toggleOption(option)}
            />
          ))}
        </div>

        <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-black/35">
          Você pode escolher mais de uma opção.
        </p>
      </div>
    )
  }

  if (question.question_type === "boolean") {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {[
          ["Sim", true],
          ["Não", false],
        ].map(([label, optionValue]) => (
          <OptionCard
            key={String(label)}
            label={String(label)}
            selected={value === optionValue}
            marker="round"
            onClick={() => setValue(optionValue)}
          />
        ))}
      </div>
    )
  }

  return (
    <input
      value={typeof value === "string" ? value : ""}
      onChange={(event) => setValue(event.target.value)}
      className={`${FIELD} text-lg leading-8 sm:text-xl`}
    />
  )
}

const FIELD =
  "w-full bg-transparent outline-none transition-colors duration-300 caret-[#9a6a4f] placeholder:text-black/25 focus:placeholder:text-black/40"

function OptionCard({
  label,
  selected,
  marker,
  onClick,
}: {
  label: string
  selected: boolean
  marker: "round" | "square"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex w-full touch-manipulation items-start gap-3.5 rounded-xl border px-4 py-4 text-left text-[0.975rem] leading-6 transition-all duration-300 sm:px-5 ${
        selected
          ? "border-[#9a6a4f]/55 bg-[#9a6a4f]/[0.07]"
          : "border-black/10 bg-white/25 hover:border-black/25 hover:bg-white/45"
      }`}
    >
      <span
        aria-hidden
        className={`mt-[0.4rem] h-2.5 w-2.5 shrink-0 border transition-all duration-300 ${
          marker === "round" ? "rounded-full" : "rounded-[3px]"
        } ${
          selected
            ? "border-[#9a6a4f] bg-[#9a6a4f]"
            : "border-black/25 bg-transparent group-hover:border-black/40"
        }`}
      />

      <span className={selected ? "text-[#1f1f1f]" : "text-black/75"}>
        {label}
      </span>
    </button>
  )
}
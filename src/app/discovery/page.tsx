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

type SessionUpload = {
  upload_id: string
  question_key: string | null
  status: string
  original_filename: string | null
  mime_type: string | null
  size_bytes: number | null
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
  uploads?: SessionUpload[]
}

// The upload step accepts many files. `discovery_uploads` stays the source of
// truth for file metadata; `discovery_answers` only records a light reference.
type UploadAnswerValue = {
  status: "ready" | "skipped"
  upload_ids: string[]
}

type UploadItemState = "preparing" | "uploading" | "ready" | "error"

type UploadItem = {
  key: string
  upload_id: string | null
  filename: string
  mime_type: string | null
  size_bytes: number | null
  state: UploadItemState
  message?: string
}

const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/quicktime",
]

const MAX_UPLOAD_BYTES = 52428800

const UPLOAD_STATE_LABEL: Record<UploadItemState, string> = {
  preparing: "Preparando...",
  uploading: "Enviando...",
  ready: "Enviado",
  error: "Não enviado",
}

function buildUploadAnswer(items: UploadItem[]): UploadAnswerValue {
  const uploadIds = items
    .filter((item) => item.state === "ready" && item.upload_id)
    .map((item) => item.upload_id as string)

  return {
    status: uploadIds.length > 0 ? "ready" : "skipped",
    upload_ids: uploadIds,
  }
}

function makeItemKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DiscoveryPage() {
  const [template, setTemplate] = useState<DiscoveryTemplate | null>(null)
  const [session, setSession] = useState<StoredSession | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showChapterIntro, setShowChapterIntro] = useState(true)

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [draftValue, setDraftValue] = useState<unknown>("")
  const [lastResetQuestionId, setLastResetQuestionId] = useState<
    string | null
  >(null)

  const [uploadsByQuestion, setUploadsByQuestion] = useState<
    Record<string, UploadItem[]>
  >({})

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

        // Files already stored in Storage come back from get_discovery_session,
        // so a resumed session never re-uploads them.
        const restoredUploads: Record<string, UploadItem[]> = {}

        for (const upload of loadedSession.uploads ?? []) {
          if (!upload.question_key || upload.status !== "ready") continue

          const bucketList =
            restoredUploads[upload.question_key] ?? []

          bucketList.push({
            key: upload.upload_id,
            upload_id: upload.upload_id,
            filename: upload.original_filename ?? "Arquivo enviado",
            mime_type: upload.mime_type,
            size_bytes: upload.size_bytes,
            state: "ready",
          })

          restoredUploads[upload.question_key] = bucketList
        }

        setUploadsByQuestion(restoredUploads)

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

  // Reset the draft/upload UI whenever the visible question changes.
  // Done synchronously during render (not in an effect) to avoid an
  // extra render pass; this is React's documented pattern for resetting
  // state when a derived key changes.
  if (currentQuestion && currentQuestion.id !== lastResetQuestionId) {
    setLastResetQuestionId(currentQuestion.id)

    const previousValue = answers[currentQuestion.question_key]

    if (currentQuestion.question_type === "upload") {
      // Upload answers are derived from `uploadsByQuestion` at save time.
      setDraftValue("")
    } else if (previousValue !== undefined) {
      setDraftValue(previousValue)
    } else if (currentQuestion.question_type === "multi_select") {
      setDraftValue([])
    } else {
      setDraftValue("")
    }
  }

  const progress =
    questions.length > 0
      ? Math.round(
          ((currentIndex + (showChapterIntro ? 0 : 1)) /
            questions.length) *
            100
        )
      : 0

  const currentUploads = currentQuestion
    ? (uploadsByQuestion[currentQuestion.question_key] ?? [])
    : []

  const uploadsInFlight = currentUploads.some(
    (item) => item.state === "preparing" || item.state === "uploading"
  )

  function hasValidAnswer() {
    if (!currentQuestion) return false

    if (currentQuestion.question_type === "upload") {
      // Optional by design: the respondent may continue with no files at all.
      if (!currentQuestion.required) return true

      return currentUploads.some((item) => item.state === "ready")
    }

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

    if (uploadsInFlight) {
      setError("Aguarde o envio dos arquivos terminar.")
      return
    }

    if (!hasValidAnswer()) {
      setError("Antes de continuar, responda esta pergunta.")
      return
    }

    const valueToSave =
      currentQuestion.question_type === "upload"
        ? buildUploadAnswer(currentUploads)
        : draftValue

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase.rpc(
        "save_discovery_answer",
        {
          p_session_id: session.sessionId,
          p_resume_token: session.resumeToken,
          p_question_key: currentQuestion.question_key,
          p_value: valueToSave,
        }
      )

      if (error) throw error

      setAnswers((current) => ({
        ...current,
        [currentQuestion.question_key]: valueToSave,
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

  function patchUploadItem(
    questionKey: string,
    itemKey: string,
    patch: Partial<UploadItem>
  ) {
    setUploadsByQuestion((current) => ({
      ...current,
      [questionKey]: (current[questionKey] ?? []).map((item) =>
        item.key === itemKey ? { ...item, ...patch } : item
      ),
    }))
  }

  // One file at a time, each with its own reserve -> Storage -> finalize cycle.
  // A failure marks only that file; files already sent are never touched.
  async function uploadSingleFile(
    questionKey: string,
    itemKey: string,
    file: File
  ) {
    if (!session) return

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      patchUploadItem(questionKey, itemKey, {
        state: "error",
        message: "Esse tipo de arquivo ainda não é aceito.",
      })
      return
    }

    if (file.size <= 0) {
      patchUploadItem(questionKey, itemKey, {
        state: "error",
        message: "Esse arquivo parece estar vazio.",
      })
      return
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      patchUploadItem(questionKey, itemKey, {
        state: "error",
        message: "Esse arquivo é maior que 50 MB.",
      })
      return
    }

    try {
      patchUploadItem(questionKey, itemKey, { state: "uploading" })

      const { data: reserved, error: reserveError } =
        await supabase.rpc("reserve_discovery_upload", {
          p_session_id: session.sessionId,
          p_resume_token: session.resumeToken,
          p_original_filename: file.name,
          p_mime_type: file.type,
          p_size_bytes: file.size,
          p_question_key: questionKey,
        })

      if (reserveError) throw reserveError

      const { bucket, object_path, upload_id } = reserved as {
        bucket: string
        object_path: string
        upload_id: string
      }

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .upload(object_path, file, {
          contentType: file.type,
          upsert: false,
        })

      if (storageError) throw storageError

      const { data: finalized, error: finalizeError } =
        await supabase.rpc("finalize_discovery_upload", {
          p_session_id: session.sessionId,
          p_resume_token: session.resumeToken,
          p_upload_id: upload_id,
        })

      if (finalizeError) throw finalizeError

      patchUploadItem(questionKey, itemKey, {
        state: "ready",
        upload_id,
        filename: finalized?.original_filename ?? file.name,
        message: undefined,
      })
    } catch (err) {
      console.error(err)

      patchUploadItem(questionKey, itemKey, {
        state: "error",
        message: "Não conseguimos enviar este arquivo. Tente novamente.",
      })
    }
  }

  async function handleFilesSelected(files: File[]) {
    if (!currentQuestion || !session) return

    const questionKey = currentQuestion.question_key

    if (files.length === 0) return

    setError(null)

    const queued = files.map((file) => ({
      file,
      item: {
        key: makeItemKey(),
        upload_id: null,
        filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        state: "preparing",
      } as UploadItem,
    }))

    setUploadsByQuestion((current) => ({
      ...current,
      [questionKey]: [
        ...(current[questionKey] ?? []),
        ...queued.map((entry) => entry.item),
      ],
    }))

    for (const entry of queued) {
      await uploadSingleFile(questionKey, entry.item.key, entry.file)
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
                Discovery concluído
              </p>

              <h1 className="rise rise-delay-1 mt-6 max-w-[15ch] text-[2.05rem] font-medium leading-[1.06] tracking-[-0.035em] break-normal hyphens-none sm:text-[2.9rem] sm:leading-[1.02] sm:tracking-[-0.04em] md:text-[3.5rem] lg:text-[4rem]">
                Agora começa a construção.
              </h1>

              <div className="rise rise-delay-2 mt-9 grid max-w-[54ch] gap-5 sm:mt-11 sm:gap-6">
                <p className="text-base leading-8 text-black/55 sm:text-lg">
                  Suas respostas são o ponto de partida para transformar o
                  que entendemos em estratégia, estrutura e experiência.
                </p>

                <p className="text-base leading-8 text-black/55 sm:text-lg">
                  Daqui em diante, seguimos um processo contínuo: construir,
                  publicar, observar e evoluir.
                </p>

                <p className="text-base leading-8 text-black/55 sm:text-lg">
                  Sem fórmulas prontas ou resultados prometidos. Com método,
                  consistência e decisões guiadas pelo que aprendermos ao
                  longo da jornada.
                </p>

                <p className="mt-4 border-t border-black/10 pt-7 text-base leading-8 text-black/70 sm:mt-6 sm:text-lg">
                  Obrigada por chegar até aqui.
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

              <h1 className="rise rise-delay-1 mt-6 max-w-[16ch] text-[2.05rem] font-medium leading-[1.06] tracking-[-0.035em] break-normal hyphens-none sm:text-[2.9rem] sm:leading-[1.02] sm:tracking-[-0.04em] md:text-[3.5rem] lg:text-[4rem]">
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

            <h1 className="mt-4 max-w-[22ch] text-[1.6rem] font-medium leading-[1.16] tracking-[-0.028em] break-normal hyphens-none sm:mt-5 sm:text-[2.1rem] sm:tracking-[-0.032em] md:text-[2.5rem] lg:text-[2.9rem]">
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
                uploadItems={currentUploads}
                onFilesSelected={handleFilesSelected}
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
  uploadItems,
  onFilesSelected,
}: {
  question: Question
  value: unknown
  setValue: (value: unknown) => void
  toggleOption: (option: string) => void
  uploadItems: UploadItem[]
  onFilesSelected: (files: File[]) => void
}) {
  if (question.question_type === "upload") {
    return (
      <UploadField
        question={question}
        items={uploadItems}
        onFilesSelected={onFilesSelected}
      />
    )
  }

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

function metadataText(
  metadata: Record<string, unknown>,
  key: string,
  fallback: string
) {
  const raw = metadata?.[key]
  return typeof raw === "string" && raw.trim().length > 0 ? raw : fallback
}

function UploadField({
  question,
  items,
  onFilesSelected,
}: {
  question: Question
  items: UploadItem[]
  onFilesSelected: (files: File[]) => void
}) {
  const metadata = question.metadata ?? {}

  const ctaLabel = metadataText(
    metadata,
    items.length > 0 ? "cta_label_more" : "cta_label",
    items.length > 0 ? "Adicionar mais arquivos" : "Adicionar arquivos"
  )

  const acceptHint = metadataText(
    metadata,
    "accept_hint",
    "PDF, DOCX, JPG, PNG, WEBP, MP4 ou MOV · até 50 MB por arquivo"
  )

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-6 grid gap-2.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-black/[0.07] pb-2.5"
            >
              <span className="min-w-0 text-[0.95rem] leading-6 text-black/70">
                {item.filename}
                {item.size_bytes ? (
                  <span className="text-black/35">
                    {" · "}
                    {formatFileSize(item.size_bytes)}
                  </span>
                ) : null}
              </span>

              <span
                className={`shrink-0 text-[11px] uppercase tracking-[0.14em] ${
                  item.state === "error"
                    ? "text-[#8a2f2f]"
                    : item.state === "ready"
                      ? "text-[#9a6a4f]"
                      : "text-black/35"
                }`}
              >
                {UPLOAD_STATE_LABEL[item.state]}
              </span>

              {item.state === "error" && item.message && (
                <p
                  role="alert"
                  className="w-full text-sm leading-6 text-[#8a2f2f]"
                >
                  {item.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="inline-flex w-fit cursor-pointer touch-manipulation items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm text-black/70 transition-colors duration-300 hover:border-black/30 hover:text-black">
        {ctaLabel}
        <input
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_UPLOAD_TYPES.join(",")}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ""
            if (files.length > 0) onFilesSelected(files)
          }}
        />
      </label>

      <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-black/35">
        {acceptHint}
      </p>
    </div>
  )
}

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
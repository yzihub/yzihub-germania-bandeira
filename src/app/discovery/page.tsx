"use client"

import { useEffect, useMemo, useState } from "react"
import { Mark } from "@/components/Mark"
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
      <main className="flex min-h-[100svh] items-center justify-center bg-paper px-[var(--shell-pad)]">
        <p className="t-eyebrow rise">Preparando tudo para você...</p>
      </main>
    )
  }

  if (finished) {
    return (
      <main className="min-h-[100svh] bg-paper text-ink">
        <section className="shell">
          <header className="t-eyebrow flex items-center justify-between gap-6 border-b border-ink-10 pb-[var(--space-3)]">
            <span>Dra. Germânia Bandeira</span>
            <span>Concluído</span>
          </header>

          {/* The closing gets the widest air in the whole flow: the sense of a
              step won comes from the room around it, not from a badge. */}
          <div className="flex flex-1 flex-col justify-center py-[var(--space-6)]">
            <div className="column">
              <Mark variant="continued" className="rise" />

              <p className="t-eyebrow rise rise-delay-1 mt-[var(--space-3)]">
                Uma etapa termina. Outra começa.
              </p>

              <h1 className="t-chapter rise rise-delay-1 mt-[var(--space-3)] max-w-[18ch] md:mt-[var(--space-4)]">
                Compreender era o primeiro passo. Agora podemos construir.
              </h1>

              <p className="t-body rise rise-delay-2 mt-[var(--space-5)]">
                O que foi reunido aqui passa a orientar as próximas decisões do
                projeto — do que precisa ser dito à forma como tudo isso será
                organizado e colocado no mundo.
              </p>

              <div className="rise rise-delay-3 mt-[var(--space-5)]">
                <hr className="rule w-16" />

                <p className="t-closing mt-[var(--space-4)]">
                  Construir, observar, aprender e continuar evoluindo.
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
      <main className="flex min-h-[100svh] items-center justify-center bg-paper px-[var(--shell-pad)]">
        <p
          role="alert"
          className="max-w-[46ch] text-center text-sm leading-6 text-danger"
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
      <main className="min-h-[100svh] bg-paper text-ink">
        <section className="shell">
          <Header
            progress={progress}
            current={currentIndex + 1}
            total={questions.length}
          />

          {/* A chapter is a page turn, not a step: serif at chapter scale, a
              short rule opening the block, more air than any question, and a
              hairline action instead of the ink pill that commits answers. */}
          <div
            key={currentQuestion.section_key}
            className="flex flex-1 flex-col justify-center py-[var(--space-6)]"
          >
            <div className="column">
              <hr className="rule rise w-16" />

              <p className="t-eyebrow rise rise-delay-1 mt-[var(--space-3)]">
                Próximo capítulo
              </p>

              <h1 className="t-chapter rise rise-delay-1 mt-[var(--space-3)] md:mt-[var(--space-4)]">
                {chapter?.title ?? "Vamos continuar"}
              </h1>

              <p className="t-body rise rise-delay-2 mt-[var(--space-5)]">
                {chapter?.intro ??
                  "As próximas perguntas vão nos ajudar a conhecer melhor você e o seu projeto."}
              </p>

              <button
                onClick={() => setShowChapterIntro(false)}
                className="btn-line rise rise-delay-3 mt-[var(--space-5)]"
              >
                Continuar
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-[100svh] bg-paper text-ink">
      <section className="shell">
        <Header
          progress={progress}
          current={currentIndex + 1}
          total={questions.length}
        />

        {/* Questions sit slightly above centre so a one-line prompt is never
            marooned in the middle of an empty page, and a long one never
            pushes its own answer field below the fold. */}
        <div className="flex flex-1 flex-col justify-center py-[var(--space-5)] lg:pb-[7vh]">
          <div key={currentQuestion.id} className="rise column">
            <p className="t-eyebrow">{chapter?.title ?? "Discovery"}</p>

            <h1 className="t-question mt-[var(--space-3)]">
              {currentQuestion.prompt}
            </h1>

            {currentQuestion.help_text && (
              <p className="t-help mt-[var(--space-2)]">
                {currentQuestion.help_text}
              </p>
            )}

            <div className="mt-[var(--space-4)]">
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
                className="mt-[var(--space-3)] text-sm leading-6 text-danger"
              >
                {error}
              </p>
            )}

            <div className="mt-[var(--space-5)] flex flex-col-reverse items-stretch gap-[var(--space-1)] sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-6">
              <button
                onClick={saveAndContinue}
                disabled={saving}
                className="btn-ink"
              >
                {saving
                  ? "Salvando..."
                  : currentIndex === questions.length - 1
                    ? "Finalizar"
                    : "Continuar"}
              </button>

              <button
                onClick={goBack}
                disabled={saving}
                className="btn-quiet self-center sm:self-auto"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

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
      <div className="t-eyebrow flex items-center justify-between gap-6 pb-[var(--space-2)]">
        <span>Dra. Germânia Bandeira</span>

        <span className="tabular-nums">
          <span className="text-ink">{current}</span>
          <span className="mx-1.5 text-ink-28">/</span>
          {total}
        </span>
      </div>

      {/* A published rule, not an app progress bar: 1px across the full
          measure of the page, advancing in the brand accent. */}
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do discovery"
        className="h-px w-full bg-ink-10"
      >
        <div
          className="h-px bg-accent transition-[width] duration-700 ease-out"
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
        rows={5}
        className="field resize-none text-[1.0625rem] leading-[1.75] sm:text-[1.125rem]"
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
        className="field text-[1.1875rem] leading-[1.6] sm:text-[1.3125rem]"
      />
    )
  }

  if (question.question_type === "single_select") {
    return (
      <div className="border-t border-ink-10">
        {question.options.map((option) => (
          <OptionRow
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
        <div className="grid border-t border-ink-10 sm:grid-cols-2 sm:gap-x-10">
          {question.options.map((option) => (
            <OptionRow
              key={option}
              label={option}
              selected={selectedValues.includes(option)}
              marker="square"
              onClick={() => toggleOption(option)}
            />
          ))}
        </div>

        <p className="t-note mt-[var(--space-3)]">
          Você pode escolher mais de uma opção.
        </p>
      </div>
    )
  }

  if (question.question_type === "boolean") {
    return (
      <div className="grid border-t border-ink-10 sm:grid-cols-2 sm:gap-x-10">
        {[
          ["Sim", true],
          ["Não", false],
        ].map(([label, optionValue]) => (
          <OptionRow
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
      className="field text-[1.1875rem] leading-[1.6] sm:text-[1.3125rem]"
    />
  )
}

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
        <ul className="mb-[var(--space-4)] border-t border-ink-10">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-10 py-[0.875rem]"
            >
              <span className="min-w-0 text-[1rem] leading-6 text-ink-80">
                {item.filename}
                {item.size_bytes ? (
                  <span className="text-ink-65">
                    {" · "}
                    {formatFileSize(item.size_bytes)}
                  </span>
                ) : null}
              </span>

              <span
                className={`t-eyebrow shrink-0 ${
                  item.state === "error"
                    ? "text-danger"
                    : item.state === "ready"
                      ? "text-accent-ink"
                      : ""
                }`}
              >
                {UPLOAD_STATE_LABEL[item.state]}
              </span>

              {item.state === "error" && item.message && (
                <p role="alert" className="w-full text-sm leading-6 text-danger">
                  {item.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="btn-line touch-manipulation">
        {ctaLabel}
        <input
          type="file"
          multiple
          className="file-input"
          accept={ALLOWED_UPLOAD_TYPES.join(",")}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ""
            if (files.length > 0) onFilesSelected(files)
          }}
        />
      </label>

      <p className="t-note mt-[var(--space-3)] max-w-[46ch]">{acceptHint}</p>
    </div>
  )
}

function OptionRow({
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
      className="option-row touch-manipulation"
    >
      <span
        aria-hidden
        className={`option-mark ${
          marker === "round" ? "rounded-full" : "rounded-[2px]"
        }`}
      />

      <span>{label}</span>
    </button>
  )
}
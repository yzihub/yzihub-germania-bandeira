/**
 * Tipos, enums e invariantes estruturais da arquitetura de conteúdo
 * do site público da Dra. Germânia.
 */

export const draGermaniaPublicWebsiteNotionSourceRefs = {
  main: "https://app.notion.com/p/3ccf8a4adecd81ff9d40ce8a14c08fc9",
  phase06: "https://app.notion.com/p/3d8f8a4adecd81198817f67e4541a633",
  phase07: "https://app.notion.com/p/3d8f8a4adecd81a49395dc817072ec03",
  phase08: "https://app.notion.com/p/3d8f8a4adecd8195a967ee35d5fd721c",
  phase09: "https://app.notion.com/p/3d8f8a4adecd818eb50feff0219abeb5",
  phase10: "https://app.notion.com/p/3d8f8a4adecd81b6be88cf7b4c7409b6",
  phase11: "https://app.notion.com/p/3d8f8a4adecd81f8ba7ef48b0a63c3e5",
} as const

export const draGermaniaPublicWebsitePublicationStatuses = ["planned", "draft", "published", "archived", "hold"] as const

export const draGermaniaPublicWebsiteReviewStatuses = ["draft", "review_required", "approved", "rejected", "stale", "hold"] as const

export const draGermaniaPublicWebsitePageTypes = ["home", "institutional", "conversion", "legal", "hub", "spoke", "strategic_context"] as const

export const draGermaniaPublicWebsitePriorities = ["P0", "P1", "P2", "P3", "HOLD"] as const

/** Indexabilidade explícita do site público — substitui booleano ambíguo. */
export const draGermaniaPublicWebsiteIndexabilityStates = [
  "public_indexable",
  "public_noindex",
  "preview_only",
  "not_public",
] as const

export const draGermaniaPublicWebsiteSchemaTypes = [
  "WebPage",
  "AboutPage",
  "ContactPage",
  "MedicalWebPage",
  "Article",
  "BlogPosting",
  "BreadcrumbList",
  "None",
] as const

export const draGermaniaPublicWebsiteCredentialStatuses = ["not_applicable", "pending_verification", "verified", "hold"] as const

export const draGermaniaPublicWebsiteMedicalReviewStatuses = ["not_applicable", "pending", "approved", "rejected"] as const

export const draGermaniaPublicWebsiteRegulatoryCheckStatuses = ["not_applicable", "pending", "approved", "rejected"] as const

export type DraGermaniaPublicWebsitePublicationStatus = (typeof draGermaniaPublicWebsitePublicationStatuses)[number]

export type DraGermaniaPublicWebsiteReviewStatus = (typeof draGermaniaPublicWebsiteReviewStatuses)[number]

export type DraGermaniaPublicWebsitePageType = (typeof draGermaniaPublicWebsitePageTypes)[number]

export type DraGermaniaPublicWebsitePriority = (typeof draGermaniaPublicWebsitePriorities)[number]

export type DraGermaniaPublicWebsiteIndexabilityState = (typeof draGermaniaPublicWebsiteIndexabilityStates)[number]

export type DraGermaniaPublicWebsiteSchemaType = (typeof draGermaniaPublicWebsiteSchemaTypes)[number]

export type DraGermaniaPublicWebsiteCredentialStatus = (typeof draGermaniaPublicWebsiteCredentialStatuses)[number]

export type DraGermaniaPublicWebsiteMedicalReviewStatus = (typeof draGermaniaPublicWebsiteMedicalReviewStatuses)[number]

export type DraGermaniaPublicWebsiteRegulatoryCheckStatus = (typeof draGermaniaPublicWebsiteRegulatoryCheckStatuses)[number]

/** Nó de conteúdo do site público da Dra. Germânia no Semantic Content Map. */
export type DraGermaniaPublicWebsiteContentNode = {
  page_id: string
  content_node_id: string
  silo_id: string | null
  hub_id: string | null
  page_type: DraGermaniaPublicWebsitePageType
  internal_title: string
  canonical_topic: string
  slug: string
  parent: string | null
  primary_intent: string
  supporting_intents: string[]
  priority: DraGermaniaPublicWebsitePriority
  publication_status: DraGermaniaPublicWebsitePublicationStatus
  indexability: DraGermaniaPublicWebsiteIndexabilityState
  must_link_to: string[]
  should_receive_links_from: string[]
  do_not_compete_with: string[]
  conversion_goal: string | null
  cta_id: string | null
  schema_type: DraGermaniaPublicWebsiteSchemaType
  credential_status: DraGermaniaPublicWebsiteCredentialStatus
  review_status: DraGermaniaPublicWebsiteReviewStatus
  medical_review_status: DraGermaniaPublicWebsiteMedicalReviewStatus
  regulatory_check_status: DraGermaniaPublicWebsiteRegulatoryCheckStatus
  source_refs: string[]
}

export type DraGermaniaPublicWebsiteSiteGraphKind = "preview" | "production"

/** Grafo derivado — visão filtrada, imutável em relação aos nós canônicos. */
export type DraGermaniaPublicWebsiteSiteGraph = {
  kind: DraGermaniaPublicWebsiteSiteGraphKind
  nodeIds: readonly string[]
  nodes: readonly DraGermaniaPublicWebsiteContentNode[]
}

export type DraGermaniaPublicWebsiteContentArchitectureValidationIssue = {
  code: string
  content_node_id?: string
  message: string
}

export type DraGermaniaPublicWebsiteContentArchitectureValidationResult = {
  valid: boolean
  issues: DraGermaniaPublicWebsiteContentArchitectureValidationIssue[]
}

/** Schema types que exigem gates YMYL adicionais para produção. */
export const draGermaniaPublicWebsiteYmylSchemaTypes = ["MedicalWebPage", "Article"] as const satisfies readonly DraGermaniaPublicWebsiteSchemaType[]

/** Nós permanentemente excluídos do Public Site Graph por decisão estratégica. */
export const draGermaniaPublicWebsiteProductionExcludedNodeIds = [
  "context_farmacoterapia_glp1",
  "hold_nutrologia_titulo_landing",
  "local_joao_pessoa",
  "local_campina_grande",
] as const

export type DraGermaniaPublicWebsiteProductionExcludedNodeId =
  (typeof draGermaniaPublicWebsiteProductionExcludedNodeIds)[number]

export function isDraGermaniaPublicWebsiteYmylSchemaType(
  schemaType: DraGermaniaPublicWebsiteSchemaType,
): boolean {
  return (draGermaniaPublicWebsiteYmylSchemaTypes as readonly string[]).includes(schemaType)
}

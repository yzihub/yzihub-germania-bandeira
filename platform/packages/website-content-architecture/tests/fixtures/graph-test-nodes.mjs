/** Fixtures locais — não alteram os 25 nós canônicos. */

const fixtureSourceRefs = ["https://fixture.test/notion"]

/** Nó draft elegível para preview. */
export const previewDraftNode = {
  page_id: "fixture_preview_draft",
  content_node_id: "fixture_preview_draft",
  silo_id: null,
  hub_id: null,
  page_type: "institutional",
  internal_title: "Fixture Preview Draft",
  canonical_topic: "Fixture preview draft node",
  slug: "/fixture/preview-draft/",
  parent: "home",
  primary_intent: "fixture",
  supporting_intents: [],
  priority: "P2",
  publication_status: "draft",
  indexability: "not_public",
  must_link_to: [],
  should_receive_links_from: [],
  do_not_compete_with: [],
  conversion_goal: null,
  cta_id: null,
  schema_type: "WebPage",
  credential_status: "not_applicable",
  review_status: "draft",
  medical_review_status: "not_applicable",
  regulatory_check_status: "not_applicable",
  source_refs: fixtureSourceRefs,
}

/** Nó published elegível para preview, mas não para produção (review pendente). */
export const previewPublishedNotProductionNode = {
  ...previewDraftNode,
  page_id: "fixture_preview_published",
  content_node_id: "fixture_preview_published",
  slug: "/fixture/preview-published/",
  internal_title: "Fixture Preview Published",
  publication_status: "published",
  indexability: "preview_only",
  review_status: "review_required",
}

/** Nó planned — excluído de preview e produção. */
export const plannedNode = {
  ...previewDraftNode,
  page_id: "fixture_planned",
  content_node_id: "fixture_planned",
  slug: "/fixture/planned/",
  internal_title: "Fixture Planned",
  publication_status: "planned",
}

/** Nó hold — excluído de preview e produção. */
export const holdNode = {
  ...previewDraftNode,
  page_id: "fixture_hold",
  content_node_id: "fixture_hold",
  slug: "/fixture/hold/",
  internal_title: "Fixture Hold",
  publication_status: "hold",
  review_status: "hold",
  priority: "HOLD",
}

/** Nó archived — excluído de preview e produção. */
export const archivedNode = {
  ...previewDraftNode,
  page_id: "fixture_archived",
  content_node_id: "fixture_archived",
  slug: "/fixture/archived/",
  internal_title: "Fixture Archived",
  publication_status: "archived",
}

/** Nó published com gates completos — elegível para produção. */
export const productionReadyNode = {
  ...previewDraftNode,
  page_id: "fixture_production_ready",
  content_node_id: "fixture_production_ready",
  slug: "/fixture/production-ready/",
  internal_title: "Fixture Production Ready",
  publication_status: "published",
  indexability: "public_indexable",
  review_status: "approved",
  credential_status: "verified",
  schema_type: "WebPage",
  medical_review_status: "not_applicable",
  regulatory_check_status: "not_applicable",
}

/** Nó published YMYL sem medical review — excluído de produção. */
export const productionYmylPendingNode = {
  ...productionReadyNode,
  page_id: "fixture_production_ymyl_pending",
  content_node_id: "fixture_production_ymyl_pending",
  slug: "/fixture/production-ymyl-pending/",
  internal_title: "Fixture Production YMYL Pending",
  schema_type: "MedicalWebPage",
  medical_review_status: "pending",
  regulatory_check_status: "pending",
}

/** Nó published com credential gate pendente — excluído de produção. */
export const productionCredentialPendingNode = {
  ...productionReadyNode,
  page_id: "fixture_production_credential_pending",
  content_node_id: "fixture_production_credential_pending",
  slug: "/fixture/production-credential-pending/",
  internal_title: "Fixture Production Credential Pending",
  credential_status: "pending_verification",
}

/** Nó GLP-1 simulado como published — ainda excluído por lista estratégica. */
export const productionGlp1ExcludedNode = {
  ...productionReadyNode,
  page_id: "fixture_glp1_excluded",
  content_node_id: "context_farmacoterapia_glp1",
  slug: "/fixture/glp1-excluded/",
  internal_title: "Fixture GLP-1 Excluded",
  schema_type: "MedicalWebPage",
  medical_review_status: "approved",
  regulatory_check_status: "approved",
}

/** Nó Nutrologia simulado como published — excluído por lista estratégica. */
export const productionNutrologiaExcludedNode = {
  ...productionReadyNode,
  page_id: "fixture_nutrologia_excluded",
  content_node_id: "hold_nutrologia_titulo_landing",
  slug: "/fixture/nutrologia-excluded/",
  internal_title: "Fixture Nutrologia Excluded",
}

/** Nó local simulado como published — excluído por lista estratégica. */
export const productionLocalExcludedNode = {
  ...productionReadyNode,
  page_id: "fixture_local_excluded",
  content_node_id: "local_joao_pessoa",
  slug: "/fixture/local-excluded/",
  internal_title: "Fixture Local Excluded",
}

/** Nó published com gates completos, mas cujo pai (presente no set) não é publicável — excluído em cascata. */
export const productionParentUnpublishableNode = {
  ...productionReadyNode,
  page_id: "fixture_production_parent_unpublishable",
  content_node_id: "fixture_production_parent_unpublishable",
  page_type: "institutional",
  slug: "/fixture/production-parent-unpublishable/",
  internal_title: "Fixture Production Parent Unpublishable",
  parent: "fixture_preview_draft",
}

export const graphFixtureNodes = [
  previewDraftNode,
  previewPublishedNotProductionNode,
  plannedNode,
  holdNode,
  archivedNode,
  productionReadyNode,
  productionYmylPendingNode,
  productionCredentialPendingNode,
  productionGlp1ExcludedNode,
  productionNutrologiaExcludedNode,
  productionLocalExcludedNode,
  productionParentUnpublishableNode,
]

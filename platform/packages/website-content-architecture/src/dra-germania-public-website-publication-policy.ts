import type {
  DraGermaniaPublicWebsiteContentArchitectureValidationIssue,
  DraGermaniaPublicWebsiteContentArchitectureValidationResult,
  DraGermaniaPublicWebsiteContentNode,
  DraGermaniaPublicWebsiteSiteGraph,
} from "./dra-germania-public-website-content-types.ts"
import {
  draGermaniaPublicWebsiteCredentialStatuses,
  draGermaniaPublicWebsiteIndexabilityStates,
  draGermaniaPublicWebsiteMedicalReviewStatuses,
  draGermaniaPublicWebsitePageTypes,
  draGermaniaPublicWebsitePriorities,
  draGermaniaPublicWebsiteProductionExcludedNodeIds,
  draGermaniaPublicWebsitePublicationStatuses,
  draGermaniaPublicWebsiteRegulatoryCheckStatuses,
  draGermaniaPublicWebsiteReviewStatuses,
  draGermaniaPublicWebsiteSchemaTypes,
  isDraGermaniaPublicWebsiteYmylSchemaType,
} from "./dra-germania-public-website-content-types.ts"
import { draGermaniaPublicWebsiteContentNodes } from "./dra-germania-public-website-content-nodes.ts"

const productionExcludedNodeIdSet = new Set<string>(draGermaniaPublicWebsiteProductionExcludedNodeIds)

const previewEligiblePublicationStatuses = new Set(["draft", "published"])

function hasValidPublicRoute(node: DraGermaniaPublicWebsiteContentNode): boolean {
  return typeof node.slug === "string" && node.slug.startsWith("/")
}

const productionBlockedReviewStatuses = new Set(["draft", "review_required", "rejected", "stale", "hold"])

const productionBlockedCredentialStatuses = new Set(["pending_verification", "hold"])

/** Indexabilidade pública — único estado aceito no Public Site Graph. */
export const draGermaniaPublicWebsiteProductionIndexability = "public_indexable" as const

function isHoldPublicationStatus(publicationStatus: DraGermaniaPublicWebsiteContentNode["publication_status"]): boolean {
  return publicationStatus === "hold"
}

function isPublicIndexability(indexability: DraGermaniaPublicWebsiteContentNode["indexability"]): boolean {
  return indexability === "public_indexable"
}

function hasResolvedCredentialGate(node: DraGermaniaPublicWebsiteContentNode): boolean {
  if (node.credential_status === "not_applicable") {
    return true
  }

  return node.credential_status === "verified"
}

function hasResolvedYmylGates(node: DraGermaniaPublicWebsiteContentNode): boolean {
  if (!isDraGermaniaPublicWebsiteYmylSchemaType(node.schema_type)) {
    return true
  }

  return node.medical_review_status === "approved" && node.regulatory_check_status === "approved"
}

function isExplicitlyExcludedFromProduction(node: DraGermaniaPublicWebsiteContentNode): boolean {
  return productionExcludedNodeIdSet.has(node.content_node_id)
}

/**
 * Determina se um nó pode entrar no Preview Site Graph.
 * Não promove indexabilidade nem altera dados canônicos.
 */
export function isDraGermaniaPublicWebsiteNodeEligibleForPreview(
  node: DraGermaniaPublicWebsiteContentNode,
): boolean {
  if (!previewEligiblePublicationStatuses.has(node.publication_status)) {
    return false
  }

  if (isHoldPublicationStatus(node.publication_status)) {
    return false
  }

  if (!hasValidPublicRoute(node)) {
    return false
  }

  return true
}

/**
 * Determina se um nó pode entrar no Public Site Graph (produção).
 * Exige gates completos; nunca infere publicação por existência de rota.
 */
export function isDraGermaniaPublicWebsiteNodeEligibleForProduction(
  node: DraGermaniaPublicWebsiteContentNode,
): boolean {
  if (node.publication_status !== "published") {
    return false
  }

  if (!hasValidPublicRoute(node)) {
    return false
  }

  if (!isPublicIndexability(node.indexability)) {
    return false
  }

  if (node.review_status !== "approved") {
    return false
  }

  if (productionBlockedReviewStatuses.has(node.review_status)) {
    return false
  }

  if (productionBlockedCredentialStatuses.has(node.credential_status)) {
    return false
  }

  if (!hasResolvedCredentialGate(node)) {
    return false
  }

  if (!hasResolvedYmylGates(node)) {
    return false
  }

  if (isExplicitlyExcludedFromProduction(node)) {
    return false
  }

  return true
}

/**
 * Remove do conjunto elegível qualquer nó cujo pai (quando exigido) não esteja,
 * ele próprio, no conjunto elegível — apenas quando o pai é resolvível dentro do
 * conjunto de nós fornecido. Fail-closed em cascata, sem inventar relações.
 */
function dropNodesWithUnpublishableParent(
  nodes: readonly DraGermaniaPublicWebsiteContentNode[],
  eligibleIds: Set<string>,
): void {
  const byId = new Map(nodes.map((node) => [node.content_node_id, node]))
  let changed = true

  while (changed) {
    changed = false

    for (const id of eligibleIds) {
      const node = byId.get(id)

      if (!node || node.page_type === "home" || !node.parent) {
        continue
      }

      const parent = byId.get(node.parent)

      if (parent && !eligibleIds.has(node.parent)) {
        eligibleIds.delete(id)
        changed = true
      }
    }
  }
}

function buildSiteGraph(
  kind: DraGermaniaPublicWebsiteSiteGraph["kind"],
  nodes: readonly DraGermaniaPublicWebsiteContentNode[],
): DraGermaniaPublicWebsiteSiteGraph {
  const eligibilityCheck =
    kind === "preview"
      ? isDraGermaniaPublicWebsiteNodeEligibleForPreview
      : isDraGermaniaPublicWebsiteNodeEligibleForProduction

  const eligibleIds = new Set(nodes.filter(eligibilityCheck).map((node) => node.content_node_id))

  if (kind === "production") {
    dropNodesWithUnpublishableParent(nodes, eligibleIds)
  }

  const selected = nodes.filter((node) => eligibleIds.has(node.content_node_id))

  return Object.freeze({
    kind,
    nodeIds: Object.freeze(selected.map((node) => node.content_node_id)),
    nodes: Object.freeze([...selected]),
  })
}

/**
 * Deriva o Preview Site Graph para desenvolvimento e revisão editorial.
 * Inclui draft e published elegíveis; nunca torna nós indexáveis.
 */
export function deriveDraGermaniaPublicWebsitePreviewSiteGraph(
  nodes: readonly DraGermaniaPublicWebsiteContentNode[] = draGermaniaPublicWebsiteContentNodes,
): DraGermaniaPublicWebsiteSiteGraph {
  return buildSiteGraph("preview", nodes)
}

/**
 * Deriva o Public Site Graph — visão exclusiva de produção pública.
 * Somente nós published + public_indexable + approved com gates resolvidos
 * e cadeia de pais publicável.
 */
export function deriveDraGermaniaPublicWebsitePublicSiteGraph(
  nodes: readonly DraGermaniaPublicWebsiteContentNode[] = draGermaniaPublicWebsiteContentNodes,
): DraGermaniaPublicWebsiteSiteGraph {
  return buildSiteGraph("production", nodes)
}

function pushIssue(
  issues: DraGermaniaPublicWebsiteContentArchitectureValidationIssue[],
  issue: DraGermaniaPublicWebsiteContentArchitectureValidationIssue,
): void {
  issues.push(issue)
}

function validateUniqueValues(
  values: string[],
  label: string,
  issues: DraGermaniaPublicWebsiteContentArchitectureValidationIssue[],
): void {
  const seen = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      pushIssue(issues, {
        code: "duplicate_value",
        message: `${label} must be unique: ${value}`,
      })
    }

    seen.add(value)
  }
}

/**
 * Valida integridade estrutural do Semantic Content Map do site público.
 */
export function validateDraGermaniaPublicWebsiteContentArchitecture(
  nodes: readonly DraGermaniaPublicWebsiteContentNode[] = draGermaniaPublicWebsiteContentNodes,
): DraGermaniaPublicWebsiteContentArchitectureValidationResult {
  const issues: DraGermaniaPublicWebsiteContentArchitectureValidationIssue[] = []
  const byNodeId = new Map(nodes.map((node) => [node.content_node_id, node]))

  const publicationStatusSet = new Set(draGermaniaPublicWebsitePublicationStatuses)
  const reviewSet = new Set(draGermaniaPublicWebsiteReviewStatuses)
  const pageTypeSet = new Set(draGermaniaPublicWebsitePageTypes)
  const prioritySet = new Set(draGermaniaPublicWebsitePriorities)
  const indexabilitySet = new Set(draGermaniaPublicWebsiteIndexabilityStates)
  const schemaTypeSet = new Set(draGermaniaPublicWebsiteSchemaTypes)
  const credentialSet = new Set(draGermaniaPublicWebsiteCredentialStatuses)
  const medicalReviewSet = new Set(draGermaniaPublicWebsiteMedicalReviewStatuses)
  const regulatoryCheckSet = new Set(draGermaniaPublicWebsiteRegulatoryCheckStatuses)

  validateUniqueValues(
    nodes.map((node) => node.page_id),
    "page_id",
    issues,
  )
  validateUniqueValues(
    nodes.map((node) => node.content_node_id),
    "content_node_id",
    issues,
  )
  validateUniqueValues(
    nodes.map((node) => node.slug),
    "slug",
    issues,
  )

  for (const node of nodes) {
    if (!node.canonical_topic.trim()) {
      pushIssue(issues, {
        code: "missing_canonical_topic",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} needs canonical_topic`,
      })
    }

    if (node.source_refs.length === 0) {
      pushIssue(issues, {
        code: "missing_source_refs",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} needs source_refs`,
      })
    }

    if (!publicationStatusSet.has(node.publication_status)) {
      pushIssue(issues, {
        code: "invalid_publication_status",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid publication_status`,
      })
    }

    if (!reviewSet.has(node.review_status)) {
      pushIssue(issues, {
        code: "invalid_review_status",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid review_status`,
      })
    }

    if (!pageTypeSet.has(node.page_type)) {
      pushIssue(issues, {
        code: "invalid_page_type",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid page_type`,
      })
    }

    if (!prioritySet.has(node.priority)) {
      pushIssue(issues, {
        code: "invalid_priority",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid priority`,
      })
    }

    if (!indexabilitySet.has(node.indexability)) {
      pushIssue(issues, {
        code: "invalid_indexability",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid indexability`,
      })
    }

    if (!schemaTypeSet.has(node.schema_type)) {
      pushIssue(issues, {
        code: "invalid_schema_type",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid schema_type`,
      })
    }

    if (!credentialSet.has(node.credential_status)) {
      pushIssue(issues, {
        code: "invalid_credential_status",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid credential_status`,
      })
    }

    if (!medicalReviewSet.has(node.medical_review_status)) {
      pushIssue(issues, {
        code: "invalid_medical_review_status",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid medical_review_status`,
      })
    }

    if (!regulatoryCheckSet.has(node.regulatory_check_status)) {
      pushIssue(issues, {
        code: "invalid_regulatory_check_status",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} has invalid regulatory_check_status`,
      })
    }

    if (node.publication_status === "hold" && isPublicIndexability(node.indexability)) {
      pushIssue(issues, {
        code: "hold_must_not_be_indexable",
        content_node_id: node.content_node_id,
        message: `${node.content_node_id} HOLD must not be public_indexable`,
      })
    }

    if (node.page_type !== "home") {
      if (!node.parent) {
        pushIssue(issues, {
          code: "missing_parent",
          content_node_id: node.content_node_id,
          message: `${node.content_node_id} must have parent`,
        })
      } else if (!byNodeId.has(node.parent)) {
        pushIssue(issues, {
          code: "invalid_parent",
          content_node_id: node.content_node_id,
          message: `${node.content_node_id} parent must exist`,
        })
      }
    }

    for (const target of node.must_link_to) {
      if (!byNodeId.has(target)) {
        pushIssue(issues, {
          code: "invalid_must_link_to",
          content_node_id: node.content_node_id,
          message: `${node.content_node_id} must_link_to target ${target} must exist`,
        })
      }
    }

    if (node.page_type === "spoke" && node.publication_status !== "hold") {
      if (!node.hub_id) {
        pushIssue(issues, {
          code: "spoke_missing_hub",
          content_node_id: node.content_node_id,
          message: `${node.content_node_id} spoke must have hub_id`,
        })
      } else {
        const hub = byNodeId.get(node.hub_id)

        if (!hub) {
          pushIssue(issues, {
            code: "spoke_unresolved_hub",
            content_node_id: node.content_node_id,
            message: `${node.content_node_id} hub_id must resolve`,
          })
        } else if (hub.page_type !== "hub") {
          pushIssue(issues, {
            code: "spoke_invalid_hub_type",
            content_node_id: node.content_node_id,
            message: `${node.content_node_id} hub_id must point to a hub`,
          })
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

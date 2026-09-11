import assert from "node:assert/strict"

import {
  draGermaniaPublicWebsiteCredentialStatuses,
  draGermaniaPublicWebsiteContentNodes,
  draGermaniaPublicWebsiteIndexabilityStates,
  draGermaniaPublicWebsitePageTypes,
  draGermaniaPublicWebsitePriorities,
  draGermaniaPublicWebsitePublicationStatuses,
  draGermaniaPublicWebsiteReviewStatuses,
  draGermaniaPublicWebsiteSchemaTypes,
} from "../src/dra-germania-public-website-content-architecture.ts"

const byNodeId = new Map(draGermaniaPublicWebsiteContentNodes.map((node) => [node.content_node_id, node]))

function uniqueValues(values, label) {
  const unique = new Set(values)
  assert.equal(unique.size, values.length, `${label} must be unique`)
}

uniqueValues(draGermaniaPublicWebsiteContentNodes.map((node) => node.page_id), "page_id")
uniqueValues(draGermaniaPublicWebsiteContentNodes.map((node) => node.content_node_id), "content_node_id")
uniqueValues(draGermaniaPublicWebsiteContentNodes.map((node) => node.slug), "slug")

const publicationStatusSet = new Set(draGermaniaPublicWebsitePublicationStatuses)
const reviewSet = new Set(draGermaniaPublicWebsiteReviewStatuses)
const pageTypeSet = new Set(draGermaniaPublicWebsitePageTypes)
const prioritySet = new Set(draGermaniaPublicWebsitePriorities)
const indexabilitySet = new Set(draGermaniaPublicWebsiteIndexabilityStates)
const schemaTypeSet = new Set(draGermaniaPublicWebsiteSchemaTypes)
const credentialSet = new Set(draGermaniaPublicWebsiteCredentialStatuses)

for (const node of draGermaniaPublicWebsiteContentNodes) {
  assert.ok(node.canonical_topic.trim(), `${node.content_node_id} needs canonical_topic`)
  assert.ok(node.source_refs.length > 0, `${node.content_node_id} needs source_refs`)
  assert.ok(publicationStatusSet.has(node.publication_status), `${node.content_node_id} has invalid publication_status`)
  assert.ok(reviewSet.has(node.review_status), `${node.content_node_id} has invalid review_status`)
  assert.ok(pageTypeSet.has(node.page_type), `${node.content_node_id} has invalid page_type`)
  assert.ok(prioritySet.has(node.priority), `${node.content_node_id} has invalid priority`)
  assert.ok(indexabilitySet.has(node.indexability), `${node.content_node_id} has invalid indexability`)
  assert.ok(schemaTypeSet.has(node.schema_type), `${node.content_node_id} has invalid schema_type`)
  assert.ok(credentialSet.has(node.credential_status), `${node.content_node_id} has invalid credential_status`)

  if (node.page_type !== "home") {
    assert.ok(node.parent, `${node.content_node_id} must have parent`)
    assert.ok(byNodeId.has(node.parent), `${node.content_node_id} parent must exist`)
  }

  for (const target of node.must_link_to) {
    assert.ok(byNodeId.has(target), `${node.content_node_id} must_link_to target ${target} must exist`)
  }

  if (node.page_type === "spoke" && node.publication_status !== "hold") {
    assert.ok(node.hub_id, `${node.content_node_id} spoke must have hub_id`)
    const hub = byNodeId.get(node.hub_id)
    assert.ok(hub, `${node.content_node_id} hub_id must resolve`)
    assert.equal(hub.page_type, "hub", `${node.content_node_id} hub_id must point to a hub`)
  }

  assert.notEqual(node.publication_status, "published", `${node.content_node_id} cannot be published in current reality`)
}

const glp1 = byNodeId.get("context_farmacoterapia_glp1")
assert.ok(glp1, "GLP-1 context must be modeled")
assert.notEqual(glp1.review_status, "approved", "GLP-1 must not be approved")
assert.equal(glp1.publication_status, "hold", "GLP-1 must remain held")
assert.equal(glp1.indexability, "not_public", "GLP-1 must not be indexable")

const nutrologia = byNodeId.get("hold_nutrologia_titulo_landing")
assert.ok(nutrologia, "Nutrologia hold must be modeled")
assert.equal(nutrologia.publication_status, "hold", "Nutrologia must remain hold")
assert.equal(nutrologia.review_status, "hold", "Nutrologia review must remain hold")

for (const localId of ["local_joao_pessoa", "local_campina_grande"]) {
  const localNode = byNodeId.get(localId)
  assert.ok(localNode, `${localId} must be modeled`)
  assert.equal(localNode.publication_status, "hold", `${localId} must remain hold`)
  assert.equal(localNode.indexability, "not_public", `${localId} must not be public`)
}

console.log(`Dra. Germania public website content architecture: ${draGermaniaPublicWebsiteContentNodes.length} nodes validated`)

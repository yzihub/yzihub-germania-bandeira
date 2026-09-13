import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  draGermaniaPublicWebsiteContentNodes,
  validateDraGermaniaPublicWebsiteContentArchitecture,
} from "../src/index.ts"

describe("Dra. Germânia public website content architecture", () => {
  it("validates exactly 25 canonical nodes", () => {
    assert.equal(draGermaniaPublicWebsiteContentNodes.length, 25)
  })

  it("passes structural validation without issues", () => {
    const result = validateDraGermaniaPublicWebsiteContentArchitecture()

    assert.equal(result.valid, true, result.issues.map((issue) => issue.message).join("; "))
    assert.equal(result.issues.length, 0)
  })

  it("preserves 10 strategic HOLD nodes excluding GLP-1", () => {
    const holdNodes = draGermaniaPublicWebsiteContentNodes.filter((node) => node.publication_status === "hold")
    assert.equal(holdNodes.length, 11)

    const strategicHolds = holdNodes.filter((node) => node.content_node_id !== "context_farmacoterapia_glp1")
    assert.equal(strategicHolds.length, 10)
  })

  it("preserves GLP-1 as hold + review_required + not_public", () => {
    const glp1 = draGermaniaPublicWebsiteContentNodes.find(
      (node) => node.content_node_id === "context_farmacoterapia_glp1",
    )

    assert.ok(glp1)
    assert.equal(glp1.publication_status, "hold")
    assert.equal(glp1.review_status, "review_required")
    assert.equal(glp1.indexability, "not_public")
  })

  it("ensures no canonical node is published", () => {
    for (const node of draGermaniaPublicWebsiteContentNodes) {
      assert.notEqual(node.publication_status, "published", `${node.content_node_id} cannot be published`)
    }
  })

  it("ensures no HOLD node is public_indexable", () => {
    for (const node of draGermaniaPublicWebsiteContentNodes) {
      if (node.publication_status === "hold") {
        assert.notEqual(node.indexability, "public_indexable", `${node.content_node_id} HOLD must not be indexable`)
      }
    }
  })
})

console.log(`Dra. Germania public website content architecture: ${draGermaniaPublicWebsiteContentNodes.length} nodes validated`)

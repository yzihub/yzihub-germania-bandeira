import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  draGermaniaPublicWebsiteContentNodes,
  deriveDraGermaniaPublicWebsitePreviewSiteGraph,
  isDraGermaniaPublicWebsiteNodeEligibleForPreview,
} from "../src/index.ts"
import {
  archivedNode,
  graphFixtureNodes,
  holdNode,
  plannedNode,
  previewDraftNode,
  previewPublishedNotProductionNode,
} from "./fixtures/graph-test-nodes.mjs"

describe("Dra. Germânia Preview Site Graph", () => {
  it("includes eligible draft nodes from fixtures", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForPreview(previewDraftNode), true)
  })

  it("includes eligible published nodes from fixtures", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForPreview(previewPublishedNotProductionNode), true)
  })

  it("excludes planned, hold and archived nodes from fixtures", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForPreview(plannedNode), false)
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForPreview(holdNode), false)
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForPreview(archivedNode), false)
  })

  it("derives preview graph from fixtures with expected membership", () => {
    const graph = deriveDraGermaniaPublicWebsitePreviewSiteGraph(graphFixtureNodes)

    assert.equal(graph.kind, "preview")
    assert.ok(graph.nodeIds.includes("fixture_preview_draft"))
    assert.ok(graph.nodeIds.includes("fixture_preview_published"))
    assert.ok(!graph.nodeIds.includes("fixture_planned"))
    assert.ok(!graph.nodeIds.includes("fixture_hold"))
    assert.ok(!graph.nodeIds.includes("fixture_archived"))
  })

  it("does not modify canonical nodes when deriving preview graph", () => {
    const snapshot = structuredClone(draGermaniaPublicWebsiteContentNodes)
    deriveDraGermaniaPublicWebsitePreviewSiteGraph()

    assert.deepEqual(draGermaniaPublicWebsiteContentNodes, snapshot)
  })

  it("never mutates indexability when deriving preview graph", () => {
    const before = structuredClone(graphFixtureNodes)
    deriveDraGermaniaPublicWebsitePreviewSiteGraph(graphFixtureNodes)

    assert.deepEqual(
      graphFixtureNodes.map((node) => node.indexability),
      before.map((node) => node.indexability),
    )
  })

  it("derives canonical preview graph with 14 draft nodes", () => {
    const graph = deriveDraGermaniaPublicWebsitePreviewSiteGraph()
    const draftCount = draGermaniaPublicWebsiteContentNodes.filter((node) => node.publication_status === "draft").length

    assert.equal(draftCount, 14)
    assert.equal(graph.nodes.length, 14)
    assert.equal(graph.nodeIds.length, 14)
  })
})

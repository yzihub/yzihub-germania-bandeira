import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  draGermaniaPublicWebsiteContentNodes,
  deriveDraGermaniaPublicWebsitePublicSiteGraph,
  isDraGermaniaPublicWebsiteNodeEligibleForProduction,
} from "../src/index.ts"
import {
  graphFixtureNodes,
  previewDraftNode,
  productionCredentialPendingNode,
  productionGlp1ExcludedNode,
  productionLocalExcludedNode,
  productionNutrologiaExcludedNode,
  productionParentUnpublishableNode,
  productionReadyNode,
  productionYmylPendingNode,
} from "./fixtures/graph-test-nodes.mjs"

describe("Dra. Germânia Public Site Graph", () => {
  it("includes only production-ready fixture node", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionReadyNode), true)
  })

  it("excludes draft nodes from fixtures", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(previewDraftNode), false)
  })

  it("excludes review_required, credential pending and YMYL pending fixtures", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionYmylPendingNode), false)
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionCredentialPendingNode), false)
  })

  it("excludes GLP-1, Nutrologia and local pages even when published in fixtures", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionGlp1ExcludedNode), false)
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionNutrologiaExcludedNode), false)
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionLocalExcludedNode), false)
  })

  it("derives production graph from fixtures with single eligible node", () => {
    const graph = deriveDraGermaniaPublicWebsitePublicSiteGraph(graphFixtureNodes)

    assert.equal(graph.kind, "production")
    assert.deepEqual([...graph.nodeIds], ["fixture_production_ready"])
    assert.equal(graph.nodes.length, 1)
  })

  it("excludes a gate-eligible node whose parent (present in the graph) is not publishable", () => {
    assert.equal(isDraGermaniaPublicWebsiteNodeEligibleForProduction(productionParentUnpublishableNode), true)

    const graph = deriveDraGermaniaPublicWebsitePublicSiteGraph(graphFixtureNodes)

    assert.ok(!graph.nodeIds.includes("fixture_production_parent_unpublishable"))
  })

  it("does not modify canonical nodes when deriving production graph", () => {
    const snapshot = structuredClone(draGermaniaPublicWebsiteContentNodes)
    deriveDraGermaniaPublicWebsitePublicSiteGraph()

    assert.deepEqual(draGermaniaPublicWebsiteContentNodes, snapshot)
  })

  it("derives empty canonical production graph — correct current reality", () => {
    const graph = deriveDraGermaniaPublicWebsitePublicSiteGraph()

    assert.equal(graph.nodes.length, 0)
    assert.equal(graph.nodeIds.length, 0)
  })
})

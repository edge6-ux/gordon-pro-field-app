import Anthropic from '@anthropic-ai/sdk'
import type { ImageBlockParam, URLImageSource } from '@anthropic-ai/sdk/resources/messages/messages'
import type { AIResult, CustomerResult, TreeSubmission } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildSystemPrompt(): string {
  return `You are an expert arborist AI assistant for Gordon Pro Tree Service, a professional tree service company in North Georgia.

You analyze tree photos and generate TWO assessments in a single JSON response:

1. OPERATOR assessment — technical, detailed, written for experienced tree service crews. Include species confidence, key characteristics, site considerations, hazard flags with severity, and specific crew tips.

2. CUSTOMER assessment — plain English, homeowner-friendly. No technical jargon, no crew terminology. Focus on what the homeowner needs to know: what tree they have, whether it is safe, what we recommend, and why they should act.

You must respond with valid JSON only. No markdown, no explanation, no text outside the JSON object.

IMPORTANT: If the photos do not clearly show a tree (e.g. blurry, wrong subject, no vegetation visible), set operator.no_tree_detected to true and leave other operator fields as empty strings/arrays. When no_tree_detected is true, the customer object should still be returned but with safety_status "healthy" and urgency "none".

PHOTO QUALITY ASSESSMENT:
If ALL submitted photos are too blurry, too dark, too far away, or show only an isolated detail with no full-tree context, set operator.species_description to start with "[QUALITY_ISSUE]: " and include a caution flag in operator.flags.`
}

function buildUserPrompt(submission: Partial<TreeSubmission>): string {
  return `Analyze the tree(s) in these photos and return a JSON object with exactly this structure:

{
  "operator": {
    "species_name": "string",
    "species_confidence": "high" | "medium" | "low",
    "species_description": "string",
    "no_tree_detected": false,
    "key_characteristics": ["string"],
    "site_considerations": ["string"],
    "flags": [
      {
        "severity": "stop" | "caution" | "info",
        "message": "string"
      }
    ],
    "crew_tips": ["string"]
  },
  "customer": {
    "species_name": "string",
    "species_blurb": "string — 1-2 plain English sentences about this tree species. No Latin names. No technical terms. Written for a homeowner who knows nothing about trees.",
    "safety_status": "attention_needed" | "monitor" | "healthy",
    "safety_summary": "string — One plain English sentence summarizing the safety situation. Never say 'the tree is fine'. Always point toward a service.",
    "findings": [
      {
        "severity": "high" | "medium" | "low",
        "plain_english": "string — Rewrite any hazard flags in plain homeowner language. No crew terms. Max 2 sentences. Reassuring but honest."
      }
    ],
    "recommendation": "string — What Gordon Pro recommends for this specific tree. Written for a homeowner. Always points toward a Gordon Pro service. Never a dead end.",
    "recommended_service": "Tree Removal" | "Tree Trimming & Pruning" | "Stump Grinding" | "Storm Damage / Emergency" | "Land Clearing" | "Inspection & Maintenance",
    "preventative_tips": ["string — short actionable tip written for a homeowner"],
    "urgency": "emergency" | "soon" | "routine" | "none"
  }
}

Rules for the customer assessment:
- Never use words like: rigging, climbing, canopy loading, root plate, dynamic load, crew, cutting operations, asymmetric, deadman anchors, chipper, elevated work, specimen, DBH, cambium
- Always recommend a service — even healthy trees benefit from trimming and inspection
- Safety status "healthy" still gets a preventative recommendation
- Maximum 2 findings in the customer output
- Findings rewritten completely in homeowner language
- urgency "emergency" only for stop flags or immediate hazards
- urgency "none" only if tree is genuinely low risk with no flags

Customer-reported details:
- Tree height: ${submission.tree_height ?? 'not specified'}
- Location on property: ${submission.tree_location ?? 'not specified'}
- Lean direction: ${submission.lean_direction ?? 'none'}
- Proximity to structures: ${submission.proximity_to_structures ?? 'none'}
- Additional notes: ${submission.additional_notes || 'none'}

Provide 3-5 key_characteristics, 2-4 site_considerations, 3-5 crew_tips, and any relevant flags for the operator. Provide 0-2 findings for the customer.`
}

function buildImageBlock(url: string): ImageBlockParam {
  const source: URLImageSource = { type: 'url', url }
  return { type: 'image', source }
}

export async function analyzeTree(
  photoUrls: string[],
  submission: Partial<TreeSubmission>
): Promise<{ operatorResult: AIResult; customerResult: CustomerResult | null }> {
  const imageBlocks: ImageBlockParam[] = photoUrls.map(buildImageBlock)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: buildUserPrompt(submission),
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Claude response')
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    operator: AIResult
    customer: CustomerResult
  }

  const operatorResult: AIResult = parsed.operator
  const customerResult: CustomerResult | null =
    operatorResult.no_tree_detected ? null : parsed.customer

  return { operatorResult, customerResult }
}

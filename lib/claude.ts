import Anthropic from '@anthropic-ai/sdk'
import type { ImageBlockParam, URLImageSource } from '@anthropic-ai/sdk/resources/messages/messages'
import type { AIResult, TreeSubmission } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildSystemPrompt(): string {
  return `You are an expert arborist assistant for Gordon Pro Tree Service, a professional tree care company.
Your role is to analyze photos of trees submitted by customers and provide actionable intelligence for the Gordon Pro crew before they arrive on site.

Always respond with valid JSON matching the AIResult schema exactly. Be specific, practical, and safety-focused.
Severity levels for flags: "info" (notable but routine), "caution" (requires extra care), "stop" (do not proceed without specialist assessment).

IMPORTANT: If the photos do not clearly show a tree (e.g. blurry, wrong subject, no vegetation visible), you must still return valid JSON but set "no_tree_detected": true and leave the other fields as empty strings/arrays. Do not attempt to identify a species when no tree is present.`
}

function buildUserPrompt(submission: Partial<TreeSubmission>): string {
  return `Analyze the submitted tree photos and details. Return a JSON object with this exact structure:
{
  "no_tree_detected": false,
  "species_name": "Common name (Scientific name)",
  "species_confidence": "high" | "medium" | "low",
  "species_description": "2-3 sentence description of this species relevant to tree work",
  "key_characteristics": ["characteristic 1", "characteristic 2", ...],
  "site_considerations": ["consideration 1", "consideration 2", ...],
  "crew_tips": ["tip 1", "tip 2", ...],
  "flags": [{ "severity": "info"|"caution"|"stop", "message": "flag message" }],
  "generated_at": "${new Date().toISOString()}"
}

If no tree is visible in the photos, return:
{
  "no_tree_detected": true,
  "species_name": "",
  "species_confidence": "low",
  "species_description": "",
  "key_characteristics": [],
  "site_considerations": [],
  "crew_tips": [],
  "flags": [],
  "generated_at": "${new Date().toISOString()}"
}

Customer-reported details:
- Tree height: ${submission.tree_height ?? 'not specified'}
- Location on property: ${submission.tree_location ?? 'not specified'}
- Lean direction: ${submission.lean_direction ?? 'none'}
- Proximity to structures: ${submission.proximity_to_structures ?? 'none'}
- Additional notes: ${submission.additional_notes || 'none'}

Provide 3-5 key_characteristics, 2-4 site_considerations, 3-5 crew_tips, and any relevant flags.
Flag any structural concerns, disease signs, hazardous conditions, or proximity risks.`
}

function buildImageBlock(url: string): ImageBlockParam {
  const source: URLImageSource = { type: 'url', url }
  return { type: 'image', source }
}

export async function analyzeTree(
  photoUrls: string[],
  submission: Partial<TreeSubmission>
): Promise<AIResult> {
  const imageBlocks: ImageBlockParam[] = photoUrls.map(buildImageBlock)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
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

  return JSON.parse(jsonMatch[0]) as AIResult
}

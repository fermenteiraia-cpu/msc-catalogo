import { z } from "zod";

/**
 * CampaignSpec — the structured output of the AI briefer.
 * This Zod schema is the SOURCE OF TRUTH for the CampaignSpec type.
 */

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

const headlineSchema = z.object({
  top: z.string().nullable(),
  main: z.string().min(1),
  sub: z.string().nullable(),
  ornament: z.enum([
    "heart-in-tilde",
    "balloon",
    "flag-bunting",
    "money-rain",
    "none",
  ]),
  lettering_style: z.enum([
    "3d-bubble-glossy",
    "3d-extrusion",
    "neon",
    "flat-bold",
  ]),
});

const paletteSchema = z.object({
  mode: z.enum([
    "light-warm",
    "dark-cool",
    "light-vibrant",
    "dark-vibrant",
  ]),
  primary: hexColor,
  secondary: hexColor,
  accent_seal: hexColor,
  bg_style: z.string().min(1),
});

const decorationSchema = z.object({
  elements: z.array(z.string().min(1)).min(3).max(6),
  density: z.enum(["baixa", "média", "alta"]),
  mood: z.array(z.string().min(1)).min(2).max(4),
});

const creativeSchema = z.object({
  headline: headlineSchema,
  palette: paletteSchema,
  decoration: decorationSchema,
  slogan_on_cover: z.string().nullable(),
});

const ctaBlockSchema = z.object({
  topline: z.string().nullable(),
  value: z.string().min(1),
  label: z.string().min(1),
  shape: z.enum(["stacked", "square", "torn-calendar", "circle"]),
  color_scheme: z.enum([
    "primary",
    "secondary",
    "white-on-transparent",
  ]),
});

const termsOnCoverSchema = z.object({
  render_mode: z.enum([
    "text_list",
    "side_seal",
    "absorbed_in_cta",
    "none",
  ]),
  items: z.array(
    z.object({
      template_id: z.string().min(1),
      params: z.record(z.string(), z.unknown()),
    }),
  ),
});

const periodSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date"),
  display_on_cover: z.object({
    enabled: z.boolean(),
    lines: z.array(z.string()).nullable(),
  }),
});

export const campaignSpecSchema = z.object({
  campaign: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    theme_key: z.enum([
      "maes",
      "abril",
      "natal",
      "black-friday",
      "custom",
    ]),
  }),
  creative: creativeSchema,
  cta_blocks: z.array(ctaBlockSchema).min(1).max(2),
  terms_on_cover: termsOnCoverSchema,
  period: periodSchema,
  audit_config: z.object({
    forbidden_strings: z.array(z.string()),
  }),
});

export type CampaignSpec = z.infer<typeof campaignSpecSchema>;

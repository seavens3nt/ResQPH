/**
 * Zod schemas for citizen rescue-request input validation.
 *
 * Boundary: U-Belt pilot area (project-defined academic prototype, not an
 * official operational boundary). Coordinate order: [longitude, latitude].
 *
 * Source: data/samples/study-area.geojson (approved_on 2026-09-22)
 */

import { z } from 'zod'
import { FLOOD_LEVEL_OPTIONS, VULNERABILITY_OPTIONS } from './types'

// ---------------------------------------------------------------------------
// Study-area boundary constants
// ---------------------------------------------------------------------------

/** U-Belt pilot bounding box — WGS 84, longitude-first. */
export const UBELT_BOUNDS = {
  west: 120.982,
  south: 14.596,
  east: 121.004,
  north: 14.6175,
} as const

export function isInsideUBeltBoundary(lng: number, lat: number): boolean {
  return (
    lng >= UBELT_BOUNDS.west &&
    lng <= UBELT_BOUNDS.east &&
    lat >= UBELT_BOUNDS.south &&
    lat <= UBELT_BOUNDS.north
  )
}

// ---------------------------------------------------------------------------
// GeoPoint schema
// ---------------------------------------------------------------------------

export const GeoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z
    .tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ])
    .refine(
      ([lng, lat]) => isInsideUBeltBoundary(lng, lat),
      {
        message:
          'Location must be inside the U-Belt pilot area ' +
          '(controlled scenario boundary). ' +
          'Longitude 120.982–121.004, Latitude 14.596–14.6175.',
      },
    ),
})

// ---------------------------------------------------------------------------
// Location schema
// ---------------------------------------------------------------------------

export const RequestLocationSchema = z.object({
  address: z
    .string()
    .trim()
    .min(5, 'Enter a street address (at least 5 characters).')
    .max(200, 'Address is too long (200 characters maximum).'),
  point: GeoPointSchema,
  landmark: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
})

// ---------------------------------------------------------------------------
// Full create-request form schema
// ---------------------------------------------------------------------------

export const CreateRequestSchema = z.object({
  location: RequestLocationSchema,
  headcount: z
    .number({ error: 'Enter the number of people needing help.' })
    .int('Headcount must be a whole number.')
    .min(1, 'At least 1 person must need assistance.')
    .max(100, 'Headcount cannot exceed 100 for this prototype.'),
  vulnerabilities: z.array(z.enum(VULNERABILITY_OPTIONS)).default([]),
  medical_needs: z.boolean().default(false),
  medical_details: z
    .string()
    .trim()
    .max(500, 'Medical details cannot exceed 500 characters.')
    .optional(),
  reported_flood_level: z.enum(FLOOD_LEVEL_OPTIONS, 'Select a flood level.'),
  situation_summary: z
    .string()
    .trim()
    .max(1000, 'Situation summary cannot exceed 1000 characters.')
    .optional(),
})

export type CreateRequestFormValues = z.infer<typeof CreateRequestSchema>

// ---------------------------------------------------------------------------
// Cancel schema
// ---------------------------------------------------------------------------

export const CancelRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Provide a reason for cancellation.')
    .max(500),
  version: z.number().int().positive(),
})

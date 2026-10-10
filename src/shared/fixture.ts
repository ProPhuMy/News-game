import { z } from 'zod';
import { RoomSnapshotSchema } from './protocol.ts';
import { PrivateSnapshotSchema, PublicSnapshotSchema } from './snapshots.ts';

/**
 * A recorded match for UI/town development (`src/sim/fixtures/*.json`).
 * Engine time starts at 0, so `atMs` and every `deadlineMs` share one clock; the player adds its own offset.
 * `private` is always seat 0 (the human).
 */
export const FixtureFrameSchema = z.object({
  atMs: z.number().min(0),
  public: PublicSnapshotSchema,
  private: PrivateSnapshotSchema,
});
export type FixtureFrame = z.infer<typeof FixtureFrameSchema>;

export const FixtureSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  room: RoomSnapshotSchema,
  frames: z.array(FixtureFrameSchema).min(1),
});
export type Fixture = z.infer<typeof FixtureSchema>;

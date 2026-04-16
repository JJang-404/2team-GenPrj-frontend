/**
 * Single chokepoint for editing → initPage wireframe cross-imports.
 *
 * Any editing module code that needs initPage wireframe layout components or
 * the slot/coordinate helpers MUST import via this file. Direct imports from
 * `../../initPage/components/wireframe` elsewhere in `modules/editing/` are
 * forbidden (enforced by AC13 grep: only this file + the pre-existing
 * removeBgPipeline import in App.tsx:26 may reference `../initPage`).
 *
 * When initPage's wireframe/ is later moved to a shared location, only this
 * file needs to update its import paths.
 */
export {
  SingleLargeLayout,
  SingleCompactLayout,
  OverlapGroupLayout,
  HalfCropGroupLayout,
} from '../../initPage/components/wireframe';

export {
  getWireframeSlots,
  getWireframeKey,
} from '../../initPage/components/wireframe/computeSlotStyle';

export {
  MAIN_ZONE_4x5,
  MAIN_ZONE_HW_RATIO,
  computeMainZone916,
} from '../../initPage/components/wireframe/outerFrameZones';
export type { FrameZone } from '../../initPage/components/wireframe/outerFrameZones';

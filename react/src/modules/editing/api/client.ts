import type {
  BootstrapResponse,
  GenerateBackgroundRequest,
  GenerateBackgroundResponse,
} from '../types/api';
import { getBootstrapData } from '../data/bootstrap';
import { generateBackgroundCandidates } from '../utils/backgroundGeneration';

export function fetchBootstrap() {
  return Promise.resolve(getBootstrapData() as BootstrapResponse);
}

export function generateBackgrounds(payload: GenerateBackgroundRequest) {
  return generateBackgroundCandidates(payload) as Promise<GenerateBackgroundResponse>;
}

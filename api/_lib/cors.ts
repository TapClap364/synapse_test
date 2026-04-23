import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_ORIGINS = [
  'https://synapse-project-chi.vercel.app',
  'https://synapseproject-tapclap364s-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean)
  ?? DEFAULT_ORIGINS);

/**
 * Apply CORS headers and short-circuit OPTIONS preflight.
 * Returns true if the request was already handled (OPTIONS).
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-Id');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

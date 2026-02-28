import { NextFunction, Request, Response } from 'express';
import { loadConfig, type ErrorSimulationRule } from '../config';
import { errorResponse } from '../types';
import type { Dashboard } from '../ui/dashboard';

/**
 * Chaos middleware — injects errors at configurable rates per route.
 * Only active when config.errorSimulation.enabled is true.
 */
export function chaosMiddleware(dashboard?: Dashboard) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const config = loadConfig();
    const sim = config.errorSimulation;

    if (!sim?.enabled || !sim.rules?.length) {
      next();
      return;
    }

    const matchingRule = sim.rules.find((rule: ErrorSimulationRule) =>
      req.path.startsWith(rule.route)
    );

    if (!matchingRule) {
      next();
      return;
    }

    if (Math.random() >= matchingRule.errorRate) {
      next();
      return;
    }

    // Inject error
    if (dashboard) {
      dashboard.logSkillCall(
        'CHAOS',
        '',
        `injected ${matchingRule.statusCode} on ${req.method} ${req.path}`
      );
    }

    res.status(matchingRule.statusCode).json(errorResponse(matchingRule.message));
  };
}

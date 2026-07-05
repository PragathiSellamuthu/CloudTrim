/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CloudResource {
  id: string;
  resource_id: string;
  type: string;
  region: string;
  cpu_util_percent: number;
  storage_gb: number;
  monthly_cost: number;
  last_active: string;
}

export interface Recommendation {
  resource_id: string;
  classification: 'idle' | 'oversized' | 'orphaned' | 'optimal';
  reasoning: string;
  priority: 'high' | 'medium' | 'low' | 'none';
  estimatedSavings: number;
}

export interface AnalysisRun {
  id: string;
  timestamp: string;
  totalCost: number;
  totalSavings: number;
  resourcesFlaggedCount: number;
  wasteCost: number;
  optimalCost: number;
  recommendations: Recommendation[];
}

export interface Settings {
  discordWebhookUrl: string;
}

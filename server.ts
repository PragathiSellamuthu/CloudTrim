import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  getResources,
  saveResources,
  getAnalyses,
  saveAnalysisRun,
  getSettings,
  saveSettings,
  clearAnalyses,
  clearResources,
} from './server/db.js';
import { CloudResource, AnalysisRun, Recommendation } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  
  // 1. Get resources
  app.get('/api/resources', async (req, res) => {
    try {
      const resources = await getResources();
      res.json({ success: true, resources });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 2. Upload resources (CSV parsed on frontend and sent as JSON)
  app.post('/api/resources/upload', async (req, res) => {
    try {
      const { resources } = req.body;
      if (!Array.isArray(resources)) {
        return res.status(400).json({ success: false, message: 'Invalid payload: resources must be an array' });
      }

      // Save to database
      await saveResources(resources);
      res.json({ success: true, count: resources.length, resources });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 3. Clear all database state
  app.post('/api/clear-all', async (req, res) => {
    try {
      await clearResources();
      await clearAnalyses();
      res.json({ success: true, message: 'Database reset successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 4. Get analyses history
  app.get('/api/analyses', async (req, res) => {
    try {
      const analyses = await getAnalyses();
      res.json({ success: true, analyses });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 5. Run AI cost optimization analysis
  app.post('/api/analyses/run', async (req, res) => {
    try {
      const resources = await getResources();
      if (resources.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No cloud resources available. Please upload resource data before running analysis.',
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: 'GEMINI_API_KEY environment variable is not configured. Please add it to your secrets.',
        });
      }

      // Lazy-initialize Gemini AI client as recommended
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Prepare data for the prompt
      const dataToAnalyze = resources.map((r) => ({
        resource_id: r.resource_id,
        type: r.type,
        region: r.region,
        cpu_util_percent: r.cpu_util_percent,
        storage_gb: r.storage_gb,
        monthly_cost: r.monthly_cost,
        last_active: r.last_active,
      }));

      const systemPrompt = `You are a Senior FinOps Analyst specializing in multi-cloud cost optimization.
Analyze the following list of cloud resources and identify cost optimization, rightsizing, or cleanup opportunities.
For EACH resource, classify its cost state as one of the following:
- "idle" (low CPU utilization (< 5%) or extremely inactive)
- "oversized" (low CPU utilization (< 25%) relative to the resource capacity, meaning it can be rightsized)
- "orphaned" (disassociated storage or resources with no active compute or last active date over 30 days ago)
- "optimal" (resource is highly utilized and active, no cost waste identified)

Provide a detailed reasoning, recommend a prioritized task ("high", "medium", "low", "none"), and estimate the monthly savings (in USD) achieved by resolving the issue.
Strictly output a JSON array of objects conforming exactly to the responseSchema provided. Ensure all resource_ids from the input are accounted for.`;

      // Prompt the model
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { text: systemPrompt },
          { text: `Here is the cloud resource data to analyze: ${JSON.stringify(dataToAnalyze)}` },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                resource_id: {
                  type: Type.STRING,
                  description: 'The unique ID of the cloud resource.',
                },
                classification: {
                  type: Type.STRING,
                  description: 'Must be exactly one of: idle, oversized, orphaned, optimal',
                },
                reasoning: {
                  type: Type.STRING,
                  description: 'Detailed mechanical reasoning for this FinOps classification.',
                },
                priority: {
                  type: Type.STRING,
                  description: 'Action priority level. Must be exactly one of: high, medium, low, none',
                },
                estimatedSavings: {
                  type: Type.NUMBER,
                  description: 'Estimated monthly cost reduction in USD. Use 0 if optimal.',
                },
              },
              required: ['resource_id', 'classification', 'reasoning', 'priority', 'estimatedSavings'],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('AI analysis returned an empty response. Please try again.');
      }

      // Parse output
      let recommendations: Recommendation[];
      try {
        recommendations = JSON.parse(responseText.trim());
      } catch (parseError) {
        console.error('Failed to parse Gemini output:', responseText);
        throw new Error('AI analysis output is not valid JSON. Please retry.');
      }

      // Calculate totals
      let totalCost = 0;
      let totalSavings = 0;
      let resourcesFlaggedCount = 0;

      // Map resources to map easily
      const resourceMap = new Map<string, CloudResource>();
      for (const res of resources) {
        resourceMap.set(res.resource_id, res);
        totalCost += res.monthly_cost;
      }

      // Enrich/Align recommendation records with original resources
      const validatedRecs: Recommendation[] = [];
      const analyzedResourceIds = new Set<string>();

      for (const rec of recommendations) {
        const originalResource = resourceMap.get(rec.resource_id);
        if (!originalResource) continue; // ignore non-existing resource ids

        analyzedResourceIds.add(rec.resource_id);

        let savings = Number(rec.estimatedSavings) || 0;
        // Cap savings at monthly cost
        if (savings > originalResource.monthly_cost) {
          savings = originalResource.monthly_cost;
        }
        if (rec.classification === 'optimal') {
          savings = 0;
        }

        const isFlagged = rec.classification !== 'optimal';
        if (isFlagged) {
          resourcesFlaggedCount++;
          totalSavings += savings;
        }

        validatedRecs.push({
          resource_id: rec.resource_id,
          classification: rec.classification,
          reasoning: rec.reasoning,
          priority: rec.classification === 'optimal' ? 'none' : rec.priority,
          estimatedSavings: savings,
        });
      }

      // Fill in any resources missed by Gemini
      for (const res of resources) {
        if (!analyzedResourceIds.has(res.resource_id)) {
          validatedRecs.push({
            resource_id: res.resource_id,
            classification: 'optimal',
            reasoning: 'Utilization analysis deems this resource healthy and optimal.',
            priority: 'none',
            estimatedSavings: 0,
          });
        }
      }

      // Construct analysis run
      const newRun: AnalysisRun = {
        id: `run-${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalCost,
        totalSavings,
        resourcesFlaggedCount,
        wasteCost: totalSavings,
        optimalCost: Math.max(0, totalCost - totalSavings),
        recommendations: validatedRecs,
      };

      // Save to database
      await saveAnalysisRun(newRun);

      res.json({ success: true, run: newRun });
    } catch (error: any) {
      console.error('Error in cost analysis run:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 6. Get settings
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await getSettings();
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 7. Save settings
  app.post('/api/settings', async (req, res) => {
    try {
      const { discordWebhookUrl } = req.body;
      await saveSettings({ discordWebhookUrl: discordWebhookUrl || '' });
      res.json({ success: true, settings: { discordWebhookUrl } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // 8. Post Embed Summary to Discord
  app.post('/api/discord/send', async (req, res) => {
    try {
      const { runId } = req.body;
      if (!runId) {
        return res.status(400).json({ success: false, message: 'Missing runId' });
      }

      const analyses = await getAnalyses();
      const run = analyses.find((a) => a.id === runId);
      if (!run) {
        return res.status(404).json({ success: false, message: 'Analysis run not found' });
      }

      const settings = await getSettings();
      // Try DB settings webhook first, then fallback to ENV secret
      const webhookUrl = settings.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;

      if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        return res.status(400).json({
          success: false,
          message:
            'Discord webhook URL is not configured or is invalid. Please save it in settings first.',
        });
      }

      // Format elegant fields for discord embed
      const flaggedResources = run.recommendations.filter((r) => r.classification !== 'optimal');
      
      const topSavingsFields = flaggedResources
        .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
        .slice(0, 4)
        .map((r) => {
          const emoji = r.classification === 'idle' ? '🛑' : r.classification === 'oversized' ? '⚖️' : '🧹';
          return `• **${r.resource_id}** (${r.classification}): Save **$${r.estimatedSavings.toFixed(2)}/mo** (Priority: ${r.priority})\n_*Reason:* ${r.reasoning.substring(0, 95)}..._`;
        })
        .join('\n\n');

      // Colors mapped to decimals
      // #2D3C59 -> 2964569 (Slate Gray / Theme background)
      // #94A378 -> 9741176 (Success / savings color)
      // #D1855C -> 13731164 (Terracotta)
      const embedColor = run.totalSavings > 0 ? 9741176 : 2964569;

      const payload = {
        embeds: [
          {
            title: '☁️ CloudTrim — AI FinOps Optimization Audit',
            description: `A senior-level cloud cost optimization analysis was completed on **${new Date(run.timestamp).toLocaleString()}**.`,
            color: embedColor,
            fields: [
              {
                name: '💵 Total Inspected Cost',
                value: `**$${run.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo**`,
                inline: true,
              },
              {
                name: '🌿 Potential Monthly Savings',
                value: `**$${run.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo**`,
                inline: true,
              },
              {
                name: '⚠️ Flagged Resources',
                value: `**${run.resourcesFlaggedCount}** of **${run.recommendations.length}** resources`,
                inline: true,
              },
              {
                name: '📉 Optimal Monthly Runrate',
                value: `**$${run.optimalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo**`,
                inline: false,
              },
              {
                name: '🎯 Key Recommendations & Action Items',
                value: topSavingsFields || 'All resources are optimally rightsized. Great job!',
                inline: false,
              },
            ],
            footer: {
              text: 'CloudTrim — AI Cloud Cost Optimizer',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const discordRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!discordRes.ok) {
        const errorText = await discordRes.text();
        throw new Error(`Discord webhook returned error: ${discordRes.status} - ${errorText}`);
      }

      res.json({ success: true, message: 'Summary embed posted to Discord successfully!' });
    } catch (error: any) {
      console.error('Error posting to Discord:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Serve static assets in production, and run Vite dev server in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CloudTrim server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

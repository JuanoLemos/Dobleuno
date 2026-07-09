/**
 * Dobleuno — CLI runner para probar el prompt manualmente
 *
 * Uso:
 *   pnpm runner "¿Puedo declarar carga a través de un bosque?"
 *   pnpm runner --eval                        # corre las 10 preguntas del fixture
 *   pnpm runner --eval --id=q1-movement-cover  # corre 1 pregunta específica
 *   pnpm runner --help
 *
 * Requiere DEEPSEEK_API_KEY en el .env o en el environment.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type OpenAI from 'openai';

import {
  DOBLEUNO_SYSTEM_PROMPT,
  PROMPT_VERSION,
  buildPrompt,
  CITATION_REGEX,
} from './system.js';
import {
  DEEPSEEK_DEFAULT_MODEL,
  createDeepSeekClient,
  getDeepSeekConfig,
} from './llm-client.js';
import type { AskResponse, Citation } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CliArgs {
  question?: string;
  evalMode: boolean;
  evalId?: string;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { evalMode: false, help: false };
  for (const arg of argv) {
    if (arg === '--eval') args.evalMode = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--id=')) args.evalId = arg.slice('--id='.length);
    else if (!arg.startsWith('--')) args.question = arg;
  }
  return args;
}

function printHelp(): void {
  console.log(`Dobleuno · prompt runner v${PROMPT_VERSION}

Uso:
  tsx src/prompts/runner.ts "¿Puedo declarar carga a través de un bosque?"
  tsx src/prompts/runner.ts --eval
  tsx src/prompts/runner.ts --eval --id=q1-movement-cover
  tsx src/prompts/runner.ts --help

Variables de entorno:
  DEEPSEEK_API_KEY    requerida
  DEEPSEEK_MODEL      default: ${DEEPSEEK_DEFAULT_MODEL}
  DEEPSEEK_BASE_URL   default: https://api.deepseek.com
  LOG_LEVEL           debug | info | warn | error
`);
}

interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

async function askDobleuno(
  client: OpenAI,
  model: string,
  question: string,
  context: Record<string, unknown> = {},
  options: CallOptions = {},
): Promise<AskResponse> {
  const t0 = performance.now();
  const systemPrompt = buildPrompt(context);
  const response = await client.chat.completions.create({
    model,
    max_tokens: options.maxTokens ?? 1500,
    temperature: options.temperature ?? 0.3,
    top_p: options.topP ?? 0.9,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });
  const t1 = performance.now();

  const choice = response.choices[0];
  if (!choice) throw new Error('DeepSeek no devolvió choices');
  const message = choice.message;
  // Para reasoner models (R1, v4) DeepSeek puede devolver reasoning_content además de content
  const text = message.content ?? '';

  const citations = extractCitations(text);
  return {
    answer: text,
    citations,
    confidence: inferConfidence(text, citations),
    latencyMs: Math.round(t1 - t0),
    model,
    promptVersion: PROMPT_VERSION,
  };
}

function extractCitations(text: string): Citation[] {
  const matches = [...text.matchAll(CITATION_REGEX)];
  return matches.map((m) => {
    const raw = (m[1] ?? '').trim();
    const lower = raw.toLowerCase();
    const source = lower.includes('tow.whfb')
      ? 'tow_whfb'
      : lower.includes('faq')
        ? 'faq'
        : lower.includes('errata')
          ? 'errata'
          : lower.includes('reglamento')
            ? 'regulation'
            : 'unknown';
    return { raw, source, matched: raw.length > 0 };
  });
}

function inferConfidence(text: string, citations: Citation[]): AskResponse['confidence'] {
  const lower = text.toLowerCase();
  if (lower.includes('no tengo esa regla') || lower.includes('solo ayudo con')) return 'rejected';
  if (lower.includes('no estoy seguro') || lower.includes('no tengo info')) return 'low';
  if (citations.length === 0) return 'low';
  return 'high';
}

interface FixtureQuestion {
  id: string;
  category: string;
  expectedType: string;
  question: string;
}

async function runEval(client: OpenAI, model: string, onlyId?: string): Promise<void> {
  const fixturePath = join(__dirname, 'fixtures', 'questions.json');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
    questions: FixtureQuestion[];
  };
  const questions = onlyId
    ? fixture.questions.filter((q) => q.id === onlyId)
    : fixture.questions;

  if (questions.length === 0) {
    console.error(`Sin preguntas con id=${onlyId}`);
    process.exit(1);
  }

  console.log(`\n=== Dobleuno · eval · ${questions.length} pregunta(s) · modelo ${model} ===\n`);

  let pass = 0;
  let fail = 0;
  const results: Array<{ id: string; pass: boolean; latencyMs: number; citations: number; notes: string[] }> = [];

  for (const q of questions) {
    process.stdout.write(`[${q.id}] ${q.category} … `);
    const res = await askDobleuno(client, model, q.question);
    const notes: string[] = [];

    let ok = true;
    if (q.expectedType === 'rejection') {
      if (res.confidence !== 'rejected') {
        ok = false;
        notes.push('debería rechazar amablemente');
      }
    } else {
      if (res.citations.length === 0) {
        ok = false;
        notes.push('sin citas');
      }
      if (res.answer.length < 40) {
        ok = false;
        notes.push('respuesta demasiado corta');
      }
    }

    if (ok) {
      pass++;
      console.log(`✓ ${res.latencyMs}ms · ${res.citations.length} cita(s)`);
    } else {
      fail++;
      console.log(`✗ ${res.latencyMs}ms · ${notes.join(', ')}`);
    }

    results.push({
      id: q.id,
      pass: ok,
      latencyMs: res.latencyMs,
      citations: res.citations.length,
      notes,
    });
  }

  console.log(`\n=== Resultado: ${pass}/${questions.length} OK · ${fail} fallaron ===\n`);

  if (fail > 0) {
    console.log('Detalle:');
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  - ${r.id}: ${r.notes.join(', ')}`);
    }
  }

  process.exit(fail > 0 ? 1 : 0);
}

async function runInteractive(client: OpenAI, model: string, question: string): Promise<void> {
  console.log(`\n=== Dobleuno · pregunta suelta · modelo ${model} ===\n`);
  console.log(`Pregunta: ${question}\n`);

  const res = await askDobleuno(client, model, question);

  console.log('--- Respuesta ---\n');
  console.log(res.answer);
  console.log('\n--- Metadata ---');
  console.log(`Latencia: ${res.latencyMs}ms`);
  console.log(`Citas encontradas: ${res.citations.length}`);
  for (const c of res.citations) {
    console.log(`  · [${c.source}] ${c.raw}`);
  }
  console.log(`Modelo: ${res.model}`);
  console.log(`Versión del prompt: ${res.promptVersion}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('Error: DEEPSEEK_API_KEY no configurada.');
    console.error('  cp .env.example .env  # completar');
    console.error('  $env:DEEPSEEK_API_KEY = "sk-..."');
    process.exit(1);
  }

  const config = getDeepSeekConfig();
  const model = config.model;
  const client = createDeepSeekClient();

  if (args.evalMode) {
    await runEval(client, model, args.evalId);
    return;
  }

  if (args.question) {
    await runInteractive(client, model, args.question);
    return;
  }

  printHelp();
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});

// Referencia a DOBLEUNO_SYSTEM_PROMPT para evitar tree-shake
void DOBLEUNO_SYSTEM_PROMPT;

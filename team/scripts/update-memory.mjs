#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const TEAM_DIR = resolve(import.meta.dirname, '..');
const MEMORY_DIR = join(TEAM_DIR, 'memory');
const MEMBERS_DIR = join(TEAM_DIR, 'members');

function extractLearnings(summary) {
  const learnings = [];
  const patterns = summary.match(/pattern[s]?:\s*([^.]+)/gi);
  const gotchas = summary.match(/gotcha[s]?:\s*([^.]+)/gi);

  if (patterns) {
    for (const p of patterns) {
      learnings.push(p.replace(/^patterns?:\s*/i, '').trim());
    }
  }
  if (gotchas) {
    for (const g of gotchas) {
      learnings.push(`Gotcha: ${g.replace(/^gotchas?:\s*/i, '').trim()}`);
    }
  }

  if (learnings.length === 0 && summary.length > 10) {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
    learnings.push(...sentences.slice(0, 3).map(s => s.trim()));
  }

  return learnings;
}

function getAreaFromType(type) {
  const areaMap = {
    'builder': 'backend',
    'debugger': 'backend',
    'designer': 'design',
    'qa-lead': 'testing',
    'release-engineer': 'infra',
    'dev-ops': 'infra',
    'doc-engineer': 'project',
    'reviewer': 'project',
    'ceo': 'project',
    'eng-manager': 'project'
  };
  return areaMap[type] || 'project';
}

function appendToMemory(area, learnings) {
  const memoryPath = join(MEMORY_DIR, `${area}.md`);
  if (!existsSync(memoryPath)) {
    console.log(`  WARN: memory/${area}.md not found`);
    return 0;
  }

  const content = readFileSync(memoryPath, 'utf-8');
  let added = 0;
  const timestamp = new Date().toISOString().split('T')[0];
  let entries = '';

  for (const learning of learnings) {
    if (content.includes(learning)) continue;
    entries += `\n- [${timestamp}] ${learning}`;
    added++;
  }

  if (added > 0) {
    writeFileSync(memoryPath, content + entries + '\n');
  }

  return added;
}

function updateMemory(memberType, summary) {
  const area = getAreaFromType(memberType);
  const learnings = extractLearnings(summary);

  if (learnings.length === 0) {
    console.log('  No learnings extracted from summary');
    return;
  }

  const added = appendToMemory(area, learnings);
  console.log(`  ADDED to memory/${area}.md: ${learnings[0].substring(0, 50)}...`);
  console.log(`\nDone: ${added} new learning(s) added to memory/${area}.md`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node update-memory.mjs <member_type> "<summary>"');
  process.exit(1);
}

updateMemory(args[0], args.slice(1).join(' '));

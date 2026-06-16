#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const TEAM_DIR = resolve(import.meta.dirname, '..');
const STATE_DIR = join(TEAM_DIR, 'state');
const MEMBERS_DIR = join(TEAM_DIR, 'members');
const GRAPH_PATH = join(TEAM_DIR, 'context', 'graph.json');
const RULES_PATH = join(TEAM_DIR, 'context', 'rules.json');

function loadJSON(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function extractKeywords(description) {
  const words = description.toLowerCase().split(/\s+/);
  return words.filter(w => w.length > 3);
}

function findContextFiles(keywords, graph) {
  if (!graph || !graph.files) return [];
  const matches = [];
  for (const [file, info] of Object.entries(graph.files)) {
    const fileLower = file.toLowerCase();
    for (const kw of keywords) {
      if (fileLower.includes(kw)) {
        matches.push(file);
        break;
      }
    }
  }
  return matches.slice(0, 10);
}

function routeTask(description) {
  const roster = loadJSON(join(STATE_DIR, 'roster.json'));
  const graph = loadJSON(GRAPH_PATH);
  const rules = loadJSON(RULES_PATH);
  const taskRegistry = loadJSON(join(STATE_DIR, 'task-registry.json'));

  if (!roster) {
    console.error('Error: roster.json not found');
    process.exit(1);
  }

  const descLower = description.toLowerCase();
  let suggestedType = 'builder';
  let suggestedMember = null;

  if (descLower.includes('fix') || descLower.includes('bug') || descLower.includes('error') || descLower.includes('crash')) {
    suggestedType = 'debugger';
  } else if (descLower.includes('test') || descLower.includes('qa') || descLower.includes('coverage')) {
    suggestedType = 'qa-lead';
  } else if (descLower.includes('design') || descLower.includes('ui') || descLower.includes('ux')) {
    suggestedType = 'designer';
  } else if (descLower.includes('review') || descLower.includes('audit')) {
    suggestedType = 'reviewer';
  } else if (descLower.includes('ship') || descLower.includes('deploy') || descLower.includes('release')) {
    suggestedType = 'release-engineer';
  } else if (descLower.includes('doc') || descLower.includes('readme') || descLower.includes('changelog')) {
    suggestedType = 'doc-engineer';
  } else if (descLower.includes('infra') || descLower.includes('docker') || descLower.includes('ci') || descLower.includes('pipeline')) {
    suggestedType = 'dev-ops';
  } else if (descLower.includes('strategy') || descLower.includes('scope') || descLower.includes('roadmap')) {
    suggestedType = 'ceo';
  }

  const idleMembers = roster.members.filter(m => m.state === 'idle' && m.type === suggestedType);
  if (idleMembers.length > 0) {
    suggestedMember = idleMembers[0].id;
  } else {
    const allIdle = roster.members.filter(m => m.state === 'idle');
    if (allIdle.length > 0) suggestedMember = allIdle[0].id;
  }

  const keywords = extractKeywords(description);
  const contextFiles = findContextFiles(keywords, graph);

  let memoryFile = 'memory/project.md';
  if (suggestedType === 'builder' || suggestedType === 'debugger') memoryFile = 'memory/backend.md';
  else if (suggestedType === 'designer') memoryFile = 'memory/design.md';
  else if (suggestedType === 'qa-lead') memoryFile = 'memory/testing.md';
  else if (suggestedType === 'release-engineer' || suggestedType === 'dev-ops') memoryFile = 'memory/infra.md';
  else if (suggestedType === 'doc-engineer') memoryFile = 'memory/project.md';

  const priority = descLower.includes('critical') || descLower.includes('urgent') ? 'critical' :
                   descLower.includes('high') || descLower.includes('fix') ? 'high' :
                   descLower.includes('low') || descLower.includes('nice') ? 'low' : 'medium';

  const estimate = suggestedType === 'debugger' ? 2 :
                   suggestedType === 'builder' ? 4 :
                   suggestedType === 'designer' ? 6 :
                   suggestedType === 'qa-lead' ? 4 :
                   suggestedType === 'reviewer' ? 2 :
                   suggestedType === 'release-engineer' ? 4 :
                   suggestedType === 'dev-ops' ? 4 :
                   suggestedType === 'doc-engineer' ? 3 : 4;

  const result = {
    description,
    suggested_type: suggestedType,
    suggested_member: suggestedMember,
    idle_members: roster.members.filter(m => m.state === 'idle').map(m => m.id),
    context_files: contextFiles,
    memory_file: memoryFile,
    priority,
    estimate_h: estimate
  };

  console.log(JSON.stringify(result, null, 2));
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node route-task.mjs "<task description>"');
  process.exit(1);
}

routeTask(args.join(' '));

#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const TEAM_DIR = resolve(import.meta.dirname, '..');
const STATE_DIR = join(TEAM_DIR, 'state');
const MEMBERS_DIR = join(TEAM_DIR, 'members');

let errors = 0;
let warnings = 0;

function log(level, msg) {
  if (level === 'error') { console.log(`  ERROR: ${msg}`); errors++; }
  else if (level === 'warn') { console.log(`  WARN: ${msg}`); warnings++; }
  else { console.log(`  OK: ${msg}`); }
}

function validateRoster() {
  console.log('\n[1/6] Validating roster.json...');
  const rosterPath = join(STATE_DIR, 'roster.json');
  if (!existsSync(rosterPath)) { log('error', 'roster.json not found'); return; }

  try {
    const roster = JSON.parse(readFileSync(rosterPath, 'utf-8'));
    if (!roster.members || !Array.isArray(roster.members)) {
      log('error', 'roster.json missing members array');
      return;
    }
    log('info', `${roster.members.length} members validated`);

    const validStates = ['idle', 'running', 'blocked', 'done'];
    for (const member of roster.members) {
      if (!member.id) log('error', `Member missing id`);
      if (!member.type) log('error', `Member ${member.id} missing type`);
      if (!member.state) log('error', `Member ${member.id} missing state`);
      else if (!validStates.includes(member.state)) log('error', `Member ${member.id} has invalid state "${member.state}" (valid: ${validStates.join(', ')})`);
    }
  } catch (e) {
    log('error', `roster.json parse error: ${e.message}`);
  }
}

function validateGaps() {
  console.log('\n[2/6] Validating gaps.json...');
  const gapsPath = join(STATE_DIR, 'gaps.json');
  if (!existsSync(gapsPath)) { log('error', 'gaps.json not found'); return; }

  try {
    const gaps = JSON.parse(readFileSync(gapsPath, 'utf-8'));
    if (!gaps.gaps || !Array.isArray(gaps.gaps)) {
      log('error', 'gaps.json missing gaps array');
      return;
    }
    log('info', `${gaps.gaps.length} gaps validated`);

    const ids = new Set();
    for (const gap of gaps.gaps) {
      if (!gap.id) log('error', 'Gap missing id');
      else if (ids.has(gap.id)) log('error', `Duplicate gap id: ${gap.id}`);
      else ids.add(gap.id);
    }
  } catch (e) {
    log('error', `gaps.json parse error: ${e.message}`);
  }
}

function validateTaskRegistry() {
  console.log('\n[3/6] Validating task-registry.json...');
  const registryPath = join(STATE_DIR, 'task-registry.json');
  if (!existsSync(registryPath)) { log('error', 'task-registry.json not found'); return; }

  try {
    const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
    if (!registry.sprints || !Array.isArray(registry.sprints)) {
      log('error', 'task-registry.json missing sprints array');
      return;
    }

    let totalTasks = 0;
    for (const sprint of registry.sprints) {
      if (sprint.tasks) totalTasks += sprint.tasks.length;
    }
    log('info', `${totalTasks} tasks validated`);
  } catch (e) {
    log('error', `task-registry.json parse error: ${e.message}`);
  }
}

function validateMemory() {
  console.log('\n[4/6] Validating memory files...');
  const memoryDir = join(TEAM_DIR, 'memory');
  if (!existsSync(memoryDir)) { log('error', 'memory/ directory not found'); return; }

  const required = ['project.md', 'backend.md', 'frontend.md', 'infra.md', 'testing.md', 'design.md', 'security.md'];
  for (const file of required) {
    const path = join(memoryDir, file);
    if (!existsSync(path)) log('error', `memory/${file} not found`);
  }
  log('info', `${required.length} memory files validated`);
}

function validateMembers() {
  console.log('\n[5/6] Validating member directories...');
  if (!existsSync(MEMBERS_DIR)) { log('error', 'members/ directory not found'); return; }

  const members = readdirSync(MEMBERS_DIR).filter(d => statSync(join(MEMBERS_DIR, d)).isDirectory());
  for (const member of members) {
    const memberDir = join(MEMBERS_DIR, member);
    const required = ['instruction.md', 'plan.md', 'status.md', 'wait.md'];
    for (const file of required) {
      if (!existsSync(join(memberDir, file))) {
        log('error', `members/${member}/${file} not found`);
      }
    }
  }
  log('info', `${members.length} member directories validated`);
}

function validateSync() {
  console.log('\n[6/6] Validating roster ↔ status.md sync...');
  const rosterPath = join(STATE_DIR, 'roster.json');
  if (!existsSync(rosterPath)) { log('error', 'roster.json not found'); return; }

  try {
    const roster = JSON.parse(readFileSync(rosterPath, 'utf-8'));
    let outOfSync = 0;

    for (const member of roster.members) {
      const statusPath = join(MEMBERS_DIR, member.id, 'status.md');
      if (!existsSync(statusPath)) {
        log('error', `members/${member.id}/status.md not found`);
        continue;
      }

      const content = readFileSync(statusPath, 'utf-8');
      const stateMatch = content.match(/state:\s*(\w+)/);
      if (stateMatch && stateMatch[1] !== member.state) {
        log('warn', `members/${member.id}/status.md state (${stateMatch[1]}) differs from roster (${member.state})`);
        outOfSync++;
      }
    }

    if (outOfSync === 0) log('info', 'All member files in sync');
  } catch (e) {
    log('error', `Sync check error: ${e.message}`);
  }
}

validateRoster();
validateGaps();
validateTaskRegistry();
validateMemory();
validateMembers();
validateSync();

console.log('\n========================================');
console.log(`Errors: ${errors}  Warnings: ${warnings}`);
if (errors === 0) console.log('All validations passed');
else process.exit(1);

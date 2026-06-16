#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const TEAM_DIR = resolve(import.meta.dirname, '..');
const STATE_DIR = join(TEAM_DIR, 'state');
const MEMBERS_DIR = join(TEAM_DIR, 'members');
const ROSTER_PATH = join(STATE_DIR, 'roster.json');

function parseStatusMd(content) {
  const stateMatch = content.match(/state:\s*(\w+)/);
  const taskMatch = content.match(/current_task:\s*(.+)/);
  return {
    state: stateMatch ? stateMatch[1] : 'unknown',
    current_task: taskMatch ? taskMatch[1].trim() : null
  };
}

function syncMembers() {
  if (!existsSync(ROSTER_PATH)) {
    console.error('Error: roster.json not found');
    process.exit(1);
  }

  const roster = JSON.parse(readFileSync(ROSTER_PATH, 'utf-8'));
  let updated = 0;

  for (const member of roster.members) {
    const statusPath = join(MEMBERS_DIR, member.id, 'status.md');
    if (!existsSync(statusPath)) {
      console.log(`  SKIP: ${member.id}/status.md not found`);
      continue;
    }

    const content = readFileSync(statusPath, 'utf-8');
    const status = parseStatusMd(content);

    if (status.state !== member.state || status.current_task !== member.current_task) {
      member.state = status.state;
      member.current_task = status.current_task;
      member.lock = status.state === 'running';
      updated++;
    }
  }

  roster.last_updated = new Date().toISOString();
  writeFileSync(ROSTER_PATH, JSON.stringify(roster, null, 2));
  console.log(`  Synced ${updated} member(s) from status.md`);
  console.log(`  Total members: ${roster.members.length}`);
}

syncMembers();

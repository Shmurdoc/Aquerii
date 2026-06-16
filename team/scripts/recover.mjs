#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const TEAM_DIR = resolve(import.meta.dirname, '..');
const STATE_DIR = join(TEAM_DIR, 'state');
const MEMBERS_DIR = join(TEAM_DIR, 'members');
const ROSTER_PATH = join(STATE_DIR, 'roster.json');

function recover() {
  console.log('Recovering team state...');

  if (!existsSync(ROSTER_PATH)) {
    console.error('Error: roster.json not found');
    process.exit(1);
  }

  const roster = JSON.parse(readFileSync(ROSTER_PATH, 'utf-8'));
  let recovered = 0;

  for (const member of roster.members) {
    if (member.state === 'running') {
      console.log(`  RESET: ${member.id} was running — resetting to idle`);
      member.state = 'idle';
      member.lock = false;
      member.current_task = null;
      recovered++;
    }

    if (!['idle', 'running', 'blocked', 'done'].includes(member.state)) {
      console.log(`  RESET: ${member.id} had invalid state "${member.state}" — resetting to idle`);
      member.state = 'idle';
      member.lock = false;
      member.current_task = null;
      recovered++;
    }

    const statusPath = join(MEMBERS_DIR, member.id, 'status.md');
    if (existsSync(statusPath)) {
      const content = readFileSync(statusPath, 'utf-8');
      const stateMatch = content.match(/state:\s*(\w+)/);
      const statusState = stateMatch ? stateMatch[1] : null;
      if (statusState === 'running') {
        const updated = content.replace(/state:\s*running/, 'state: idle');
        writeFileSync(statusPath, updated);
        console.log(`  RESET: ${member.id}/status.md was running — reset to idle`);
        recovered++;
      }
    }
  }

  roster.last_updated = new Date().toISOString();
  writeFileSync(ROSTER_PATH, JSON.stringify(roster, null, 2));
  console.log(`\nRecovery complete: ${recovered} state(s) reset`);
}

recover();

#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const GRAPH_PATH = join(import.meta.dirname, '..', 'context', 'graph.json');

function walkDir(dir, extensions) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'vendor', 'dist', '__pycache__'].includes(entry.name)) {
          results.push(...walkDir(fullPath, extensions));
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

function scanImports(file) {
  try {
    const content = readFileSync(file, 'utf-8');
    const imports = [];

    const phpUsePattern = /use\s+(App\\[^\s;]+)/g;
    let match;
    while ((match = phpUsePattern.exec(content)) !== null) {
      imports.push(match[1].replace(/\\/g, '/') + '.php');
    }

    const tsImportPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = tsImportPattern.exec(content)) !== null) {
      const path = match[1];
      if (path.startsWith('.') || path.startsWith('@')) {
        imports.push(path);
      }
    }

    return imports;
  } catch {
    return [];
  }
}

function scanRoutes() {
  const routesPath = join(ROOT, 'services/api/routes/api.php');
  if (!existsSync(routesPath)) return {};

  try {
    const content = readFileSync(routesPath, 'utf-8');
    const routes = {};
    const routePattern = /Route::(apiResource|get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:\[?\s*(\w+)(?:::class)?['",]?\s*|['"](\w+)@?)/g;
    let match;
    while ((match = routePattern.exec(content)) !== null) {
      const path = match[2];
      const controller = match[3] || match[4];
      if (!controller) continue;
      routes[`${match[1].toUpperCase()} /api/workspaces/{wid}/${path}`] = {
        controller: controller + '.php',
        method: match[1]
      };
    }
    return routes;
  } catch {
    return {};
  }
}

function buildGraph() {
  console.log('Building context graph...');

  const graph = { routes: {}, imports: {}, files: {} };

  graph.routes = scanRoutes();
  console.log(`  Routes: ${Object.keys(graph.routes).length}`);

  const phpFiles = walkDir(join(ROOT, 'services/api/app'), ['.php']);
  for (const file of phpFiles) {
    const relativePath = relative(ROOT, file).replace(/\\/g, '/');
    const imports = scanImports(file);
    if (imports.length > 0) {
      graph.imports[relativePath] = imports;
    }
    graph.files[relativePath] = { type: 'php' };
  }
  console.log(`  PHP files: ${phpFiles.length}`);

  const tsFiles = [
    ...walkDir(join(ROOT, 'services/web/src'), ['.ts', '.tsx'])
  ];
  for (const file of tsFiles) {
    const relativePath = relative(ROOT, file).replace(/\\/g, '/');
    const imports = scanImports(file);
    if (imports.length > 0) {
      graph.imports[relativePath] = imports;
    }
    graph.files[relativePath] = { type: 'typescript' };
  }
  console.log(`  TS/TSX files: ${tsFiles.length}`);

  const importCount = Object.keys(graph.imports).length;
  console.log(`  Import relationships: ${importCount}`);

  writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
  console.log(`Context graph written to ${GRAPH_PATH}`);
}

buildGraph();

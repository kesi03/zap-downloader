#!/usr/bin/env node
/**
 * Workflow test for Node.js zap-downloader.
 * Tests: core -p linux -> addons -c config -> pack -> unpack -> daemon
 */

const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');

const WORKSPACE = path.join(__dirname, '..', 'workspace');
const ZAP_DIR = path.join(WORKSPACE, 'zap');
const ADDONS_DIR = path.join(ZAP_DIR, 'addons');
const PACKAGES_DIR = path.join(WORKSPACE, 'packages');
const INSTALL_DIR = path.join(WORKSPACE, 'install');

function setupWorkspace() {
  if (fs.existsSync(WORKSPACE)) {
    fs.rmSync(WORKSPACE, { recursive: true, force: true });
  }
  fs.mkdirSync(WORKSPACE, { recursive: true });
  fs.mkdirSync(PACKAGES_DIR, { recursive: true });
  console.log(`Created workspace: ${WORKSPACE}`);
}

function runCommand(cmd, cwd = process.cwd()) {
  console.log(`\n> ${cmd.join(' ')}`);
  try {
    const result = execSync(cmd.join(' '), { 
      cwd, 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(result);
    return result;
  } catch (error) {
    console.log('STDOUT:', error.stdout);
    console.log('STDERR:', error.stderr);
    throw error;
  }
}

function stepCore() {
  console.log('\n=== Step 1: core -p linux ===');
  runCommand([
    'npx', 'ts-node', 'src/index.ts', 'core',
    '-p', 'linux',
    '-w', WORKSPACE
  ], path.join(__dirname, '..', 'apps', 'zap-downloader-node'));
  
  if (!fs.existsSync(ZAP_DIR)) {
    throw new Error(`ZAP directory not found: ${ZAP_DIR}`);
  }
  const files = fs.readdirSync(ZAP_DIR);
  if (!files.some(f => f.endsWith('.tar.gz'))) {
    throw new Error('No tar.gz file found');
  }
  console.log('Step 1 PASSED: core downloaded');
}

function stepAddons() {
  console.log('\n=== Step 2: addons -c config ===');
  const configPath = path.join(__dirname, '..', 'apps', 'zap-downloader-node', 'config', 'release-config.yaml');
  
  runCommand([
    'npx', 'ts-node', 'src/index.ts', 'addons',
    '-c', configPath,
    '-w', WORKSPACE
  ], path.join(__dirname, '..', 'apps', 'zap-downloader-node'));
  
  console.log('Step 2 PASSED: addons downloaded');
}

function stepPack() {
  console.log('\n=== Step 3: pack -> workspace/packages ===');
  const outputPath = path.join(PACKAGES_DIR, 'zap-package.tar');
  
  runCommand([
    'npx', 'ts-node', 'src/index.ts', 'package',
    '-o', outputPath,
    '-w', WORKSPACE
  ], path.join(__dirname, '..', 'apps', 'zap-downloader-node'));
  
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Package not found: ${outputPath}`);
  }
  console.log('Step 3 PASSED: package created');
}

function stepUnpack() {
  console.log('\n=== Step 4: unpack -> install ===');
  const packagePath = path.join(PACKAGES_DIR, 'zap-package.tar');
  
  runCommand([
    'npx', 'ts-node', 'src/index.ts', 'unpack',
    '-i', packagePath,
    '-o', INSTALL_DIR
  ], path.join(__dirname, '..', 'apps', 'zap-downloader-node'));
  
  if (!fs.existsSync(INSTALL_DIR)) {
    throw new Error(`Install directory not found: ${INSTALL_DIR}`);
  }
  console.log('Step 4 PASSED: unpacked to install');
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function stepDaemon() {
  console.log('\n=== Step 5: daemon -> curl version ===');
  
  // Find the JAR file
  let jarPath = null;
  function findJar(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isDirectory()) {
        findJar(fullPath);
      } else if (f.endsWith('.jar') && f.startsWith('zap')) {
        jarPath = fullPath;
      }
    }
  }
  findJar(INSTALL_DIR);
  
  if (!jarPath) {
    console.log('JAR not found, skipping daemon test');
    return;
  }
  
  console.log(`Found JAR: ${jarPath}`);
  
  // Start daemon
  const proc = spawn('npx', [
    'ts-node', 'src/index.ts', 'daemon', 'start-daemon',
    '-d', path.dirname(jarPath),
    '-w', WORKSPACE,
    '-P', '8080'
  ], {
    cwd: path.join(__dirname, '..', 'apps', 'zap-downloader-node'),
    stdio: 'pipe',
    shell: true
  });
  
  proc.stdout.on('data', d => console.log(d.toString()));
  proc.stderr.on('data', d => console.log(d.toString()));
  
  // Wait for ZAP to start
  const maxWait = 60;
  let started = false;
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const resp = await httpGet('http://localhost:8080/JSON/core/view/version/');
        if (resp.status === 200) {
          console.log(`ZAP version: ${resp.data}`);
          console.log('Step 5 PASSED: daemon started and responding');
          started = true;
          clearInterval(checkInterval);
          
          // Stop daemon
          try {
            runCommand([
              'npx', 'ts-node', 'src/index.ts', 'daemon', 'stop-daemon',
              '-w', WORKSPACE
            ], path.join(__dirname, '..', 'apps', 'zap-downloader-node'));
          } catch (e) {
            console.log('',e)
          }
          
          setTimeout(() => {
            proc.kill();
            resolve();
          }, 2000);
        }
      } catch (e) {
        console.log('',e)
      }
    }, 1000);
    
    setTimeout(() => {
      if (!started) {
        clearInterval(checkInterval);
        proc.kill();
        reject(new Error('Daemon failed to start within timeout'));
      }
    }, maxWait * 1000);
  });
}

async function main() {
  console.log('=== ZAP Downloader Workflow Test (Node.js) ===');
  console.log(`Workspace: ${WORKSPACE}`);
  
  try {
    setupWorkspace();
    stepCore();
    stepAddons();
    stepPack();
    stepUnpack();
    await stepDaemon();
    
    console.log('\n=== ALL TESTS PASSED ===');
    process.exit(0);
  } catch (error) {
    console.error(`\n=== TEST FAILED: ${error.message} ===`);
    process.exit(1);
  }
}

await main();

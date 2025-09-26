#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      load: null,
      api: null
    };
  }

  async runCommand(command, args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
      console.log('─'.repeat(50));
      
      const proc = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: true
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Command completed successfully\n');
          resolve(true);
        } else {
          console.log(`❌ Command failed with code ${code}\n`);
          resolve(false);
        }
      });

      proc.on('error', (error) => {
        console.error(`❌ Command error: ${error.message}\n`);
        reject(error);
      });
    });
  }

  async runUnitTests() {
    console.log('📋 Running Unit Tests...');
    this.results.unit = await this.runCommand('npm', ['test']);
    return this.results.unit;
  }

  async runIntegrationTests() {
    console.log('🔗 Running Integration Tests...');
    this.results.integration = await this.runCommand('npm', ['run', 'test:integration']);
    return this.results.integration;
  }

  async runLoadTests() {
    console.log('⚡ Running Load Tests...');
    this.results.load = await this.runCommand('npm', ['run', 'test:load']);
    return this.results.load;
  }

  async runApiTests() {
    console.log('🌐 Running API Tests with Newman...');
    this.results.api = await this.runCommand('npm', ['run', 'test:api']);
    return this.results.api;
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Check if services are running first
    console.log('Checking if services are running...');
    try {
      const axios = require('axios');
      await axios.get('http://localhost:3001/health', { timeout: 2000 });
      console.log('✓ Services are already running');
    } catch (error) {
      console.log('❌ Services are not running!');
      console.log('');
      console.log('To run tests, you need to start the services first:');
      console.log('');
      console.log('1. Install Docker Desktop from: https://www.docker.com/products/docker-desktop');
      console.log('2. Start Docker Desktop');
      console.log('3. Run: docker compose up -d');
      console.log('   (or use: npm run services:start if available)');
      console.log('');
      console.log('The services will be available at:');
      console.log('- Inventory Service: http://localhost:3001');
      console.log('- Order Service: http://localhost:3002');
      console.log('- Shipping Service: http://localhost:3003');
      console.log('');
      console.log('Once services are running, try the tests again with: npm run test:all');
      return false;
    }
    
    const setupScript = path.join(__dirname, 'data', 'setup-test-environment.js');
    return await this.runCommand('node', [setupScript, 'setup']);
  }

  async resetTestEnvironment() {
    console.log('🧹 Resetting test environment...');
    const setupScript = path.join(__dirname, 'data', 'setup-test-environment.js');
    return await this.runCommand('node', [setupScript, 'reset']);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'Unit Tests', result: this.results.unit },
      { name: 'Integration Tests', result: this.results.integration },
      { name: 'Load Tests', result: this.results.load },
      { name: 'API Tests', result: this.results.api }
    ];

    tests.forEach(test => {
      const status = test.result === null ? '⏭️ SKIPPED' : 
                    test.result === true ? '✅ PASSED' : 
                    '❌ FAILED';
      console.log(`${test.name.padEnd(20)} ${status}`);
    });

    console.log('='.repeat(60));
    
    const totalRun = tests.filter(t => t.result !== null).length;
    const totalPassed = tests.filter(t => t.result === true).length;
    const totalFailed = tests.filter(t => t.result === false).length;
    
    console.log(`Total: ${totalRun} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
    
    if (totalFailed > 0) {
      console.log('\n❌ Some tests failed. Check the output above for details.');
      return false;
    } else if (totalRun === 0) {
      console.log('\n⚠️ No tests were run.');
      return false;
    } else {
      console.log('\n🎉 All tests passed successfully!');
      return true;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive test suite...\n');
    
    try {
      // Setup test environment first
      await this.setupTestEnvironment();
      
      // Run all test suites
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runLoadTests();
      await this.runApiTests();
      
      // Print final results
      const success = this.printResults();
      
      // Cleanup
      await this.resetTestEnvironment();
      
      return success;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      return false;
    }
  }
}

// Command line interface
async function main() {
  const testRunner = new TestRunner();
  const command = process.argv[2] || 'all';

  let success = false;

  switch (command) {
    case 'unit':
      success = await testRunner.runUnitTests();
      break;
    case 'integration':
      success = await testRunner.runIntegrationTests();
      break;
    case 'load':
      success = await testRunner.runLoadTests();
      break;
    case 'api':
      success = await testRunner.runApiTests();
      break;
    case 'setup':
      success = await testRunner.setupTestEnvironment();
      break;
    case 'reset':
      success = await testRunner.resetTestEnvironment();
      break;
    case 'all':
    default:
      success = await testRunner.runAllTests();
      break;
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = TestRunner;
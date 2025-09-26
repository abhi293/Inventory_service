#!/usr/bin/env node

const newman = require('newman');
const path = require('path');
const fs = require('fs');

const collectionPath = path.join(__dirname, 'Order-Management-System.postman_collection.json');
const environmentPath = path.join(__dirname, 'environment.dev.json');
const reportDir = path.join(__dirname, '..', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
}

console.log('Starting API tests with Newman...\n');

newman.run({
    collection: collectionPath,
    environment: environmentPath,
    reporters: ['cli', 'html', 'json'],
    reporter: {
        html: {
            export: path.join(reportDir, 'newman-report.html')
        },
        json: {
            export: path.join(reportDir, 'newman-report.json')
        }
    },
    iterationCount: 1,
    delayRequest: 1000, // 1 second delay between requests
    timeout: 10000, // 10 second timeout
    insecure: true // Accept self-signed SSL certificates
}, function (err) {
    if (err) {
        console.error('Newman run failed:', err);
        process.exit(1);
    }
    
    console.log('\nNewman run completed successfully!');
    console.log(`HTML Report: ${path.join(reportDir, 'newman-report.html')}`);
    console.log(`JSON Report: ${path.join(reportDir, 'newman-report.json')}`);
});
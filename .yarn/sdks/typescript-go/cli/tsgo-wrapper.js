#!/usr/bin/env node

const { spawn } = require('node:child_process');

const [, , tsgoBinaryPath, ...tsgoArgs] = process.argv;

if (!tsgoBinaryPath) {
    console.error('Usage: node tsgo-wrapper.js <tsgo-binary-path> [args...]');
    process.exit(1);
}

const telemetryLoggerPath =
    './packages/apps/tools/toolkit/tsserver/tsgo-logger-worker.js';

// Spawn the real tsgo binary
const tsgo = spawn(tsgoBinaryPath, tsgoArgs, {
    stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr (inherit stderr to see errors)
});

const telemetryLogger = spawn(
    'node',
    ['-r', './.pnp.cjs', telemetryLoggerPath],
    {
        stdio: ['pipe', 'inherit', 'inherit'],
        cwd: process.cwd(),
    },
);

const start = performance.timeOrigin;
const timeNowMicroS = () => {
    return Math.round((performance.now() + start) * 1000);
};

// Process error handling
tsgo.on('error', (err) => {
    console.error('Failed to start tsgo binary:', err);
    process.exit(1);
});
telemetryLogger.on('error', (err) => {
    console.error('Telemetry logger error:', err);
});

// TODO: find a way to have both streams forwarded to stdin without sometimes overlapping
// Intercept stdin from IDE extension to tsgo
process.stdin.on('data', (chunk) => {
    // Forward data to tsgo binary
    tsgo.stdin.write(chunk);

    // Modify content and forward to telemetry logger
    const chunkStr = chunk.toString();
    const modifiedChunk = chunkStr.replace(
        /Content-Length(?=: \d+)/gm,
        `timestamp: ${timeNowMicroS()} | Stdin-Content-Length`,
    );

    telemetryLogger.stdin.write(modifiedChunk);
});

// Intercept stdout from tsgo to IDE extension
tsgo.stdout.on('data', (chunk) => {
    // Forward data to IDE extension
    process.stdout.write(chunk);

    // Modify content and forward to telemetry logger
    const chunkStr = chunk.toString();
    const modifiedChunk = chunkStr.replace(
        /Content-Length(?=: \d+)/gm,
        `timestamp: ${timeNowMicroS()} | Stdout-Content-Length`,
    );

    telemetryLogger.stdin.write(modifiedChunk);
});

// Process termination handling
process.stdin.on('end', () => {
    tsgo.stdin.end();
    telemetryLogger.stdin.end();
});
tsgo.on('close', (code) => {
    telemetryLogger.stdin.end();
    process.exit(code);
});

// Signal handling
process.on('SIGTERM', () => {
    tsgo.kill('SIGTERM');
    telemetryLogger.kill('SIGTERM');
});
process.on('SIGINT', () => {
    tsgo.kill('SIGINT');
    telemetryLogger.kill('SIGINT');
});

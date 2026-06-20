try {
  const ts = require('./node_modules/typescript');
  console.log('TypeScript version:', ts.version);

  const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  console.log('Config path:', configPath);

  if (!configPath) {
    console.error('ERROR: tsconfig.json not found');
    process.exit(1);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    console.error('ERROR reading config:', ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    process.exit(1);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');

  // Step 1: Type check (noEmit)
  console.log('\n=== STEP 1: tsc --noEmit (Type Check) ===');
  const host1 = ts.createCompilerHost(parsedConfig.options);
  const opts1 = { ...parsedConfig.options, noEmit: true };
  const program1 = ts.createProgram(parsedConfig.fileNames, opts1, host1);
  const diagnostics1 = ts.getPreEmitDiagnostics(program1);

  if (diagnostics1.length === 0) {
    console.log('No type errors found.');
    console.log('EXIT CODE: 0');
    console.log('SUCCESS: true');
  } else {
    diagnostics1.forEach(d => {
      if (d.file) {
        const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        console.log(`${d.file.fileName}(${line + 1},${character + 1}): error TS${d.code}: ${msg}`);
      } else {
        console.log(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      }
    });
    console.log(`Found ${diagnostics1.length} type error(s).`);
    console.log('EXIT CODE: 1');
    console.log('SUCCESS: false');
  }

  // Step 2: Build (emit)
  console.log('\n=== STEP 2: tsc (Build) ===');
  const host2 = ts.createCompilerHost(parsedConfig.options);
  const program2 = ts.createProgram(parsedConfig.fileNames, parsedConfig.options, host2);
  const preDiags = ts.getPreEmitDiagnostics(program2);
  const emitResult = program2.emit();

  const allDiags = [...preDiags, ...emitResult.diagnostics];
  if (allDiags.length === 0) {
    console.log('Build succeeded with no errors.');
    console.log('EXIT CODE: 0');
    console.log('SUCCESS: true');
  } else {
    allDiags.forEach(d => {
      if (d.file) {
        const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
        const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        console.log(`${d.file.fileName}(${line + 1},${character + 1}): error TS${d.code}: ${msg}`);
      } else {
        console.log(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      }
    });
    console.log(`Found ${allDiags.length} error(s).`);
    console.log('EXIT CODE: 1');
    console.log('SUCCESS: false');
  }
} catch (e) {
  console.error('Fatal error:', e.message);
  process.exit(1);
}

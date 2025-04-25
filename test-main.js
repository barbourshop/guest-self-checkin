const fs = require('fs');

// Read the file and check for any issues
fs.readFile('main.js', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Check for BOM
  if (data.charCodeAt(0) === 0xFEFF) {
    console.log('File has BOM (Byte Order Mark)');
  }

  // Check for mixed line endings
  const hasCRLF = data.includes('\r\n');
  const hasLF = data.includes('\n');
  if (hasCRLF && hasLF) {
    console.log('File has mixed line endings (both CRLF and LF)');
  } else if (hasCRLF) {
    console.log('File uses CRLF line endings');
  } else if (hasLF) {
    console.log('File uses LF line endings');
  }

  // Check for any non-printable characters
  const nonPrintable = data.match(/[\x00-\x1F\x7F-\x9F]/g);
  if (nonPrintable) {
    console.log('Found non-printable characters:', nonPrintable);
  }

  // Try to parse the file as JSON to check syntax
  try {
    // Wrap in an object to make it valid JSON
    const wrapped = `{"content": ${data}}`;
    JSON.parse(wrapped);
    console.log('File syntax appears valid');
  } catch (e) {
    console.error('Syntax error in file:', e.message);
    // Try to find the problematic line
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      try {
        JSON.parse(`{"content": ${lines[i]}}`);
      } catch (lineErr) {
        console.log(`Potential issue on line ${i + 1}:`, lines[i]);
      }
    }
  }
}); 
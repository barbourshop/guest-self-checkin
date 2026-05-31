const fs = require('fs');
const os = require('os');
const path = require('path');
const { getSquareTokenFilePath, getSupportPaths } = require('../supportPaths');

describe('square token file', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'square-token-test-'));
    process.env.ELECTRON_USER_DATA = tempDir;
  });

  afterEach(() => {
    delete process.env.ELECTRON_USER_DATA;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports hasSquareToken when token file exists', () => {
    const tokenPath = getSquareTokenFilePath();
    fs.writeFileSync(tokenPath, 'test-token', 'utf8');

    const paths = getSupportPaths();
    expect(paths.hasSquareToken).toBe(true);
    expect(paths.squareTokenFile).toBe(tokenPath);
  });

  it('reports no token when file is missing', () => {
    const paths = getSupportPaths();
    expect(paths.hasSquareToken).toBe(false);
  });
});

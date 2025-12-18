const fs = require('fs');
const path = require('path');

const prismaDir = path.join(__dirname, '../dist/src/generated/prisma');

function fixImportMetaInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Replace import.meta.url with __filename (CommonJS compatible)
  // This is a workaround for Prisma 7 ES module syntax in CommonJS builds
  
  // First, replace the specific pattern with __dirname
  content = content.replace(
    /globalThis\['__dirname'\]\s*=\s*path\.dirname\(\(0,\s*node_url_1\.fileURLToPath\)\(import\.meta\.url\)\);/g,
    "globalThis['__dirname'] = __dirname;"
  );
  
  // Also replace any remaining import.meta.url references
  content = content.replace(/import\.meta\.url/g, '__filename');
  
  // Replace any other import.meta usage
  content = content.replace(/import\.meta/g, '{ url: __filename }');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed import.meta in ${path.relative(process.cwd(), filePath)}`);
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      fixImportMetaInFile(filePath);
    }
  }
}

if (fs.existsSync(prismaDir)) {
  processDirectory(prismaDir);
  console.log('Fixed import.meta in Prisma generated files');
} else {
  console.log('Prisma generated files not found, skipping fix');
}


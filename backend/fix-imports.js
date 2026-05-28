const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // If we imported it wrongly as `./config/api` in subfolders, fix it
      if (content.includes("from './config/api'")) {
        const relDepth = fullPath.split(path.sep).length - 2; // e.g. src/contexts/AuthContext.tsx -> length 3 -> depth 1 -> needs '../config/api'
        if (relDepth > 1) {
          console.log('Fixing import path in:', fullPath);
          content = content.replace("from './config/api'", "from '../config/api'");
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      }
    }
  });
}

fixImports('src');
console.log('Done fixing imports!');

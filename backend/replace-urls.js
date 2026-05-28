const fs = require('fs');
const path = require('path');

const configImport = "\nimport { API_BASE_URL } from '../config/api';";
const configImportRoot = "\nimport { API_BASE_URL } from './config/api';";
const configImportDeep = "\nimport { API_BASE_URL } from '../../config/api';";

function replaceUrls(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceUrls(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') && !fullPath.includes('api.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('http://localhost:5000')) {
        console.log('Updating URLs in:', fullPath);
        
        // Determine relative import depth
        const relDepth = fullPath.split(path.sep).length - 2; // e.g. src/pages/Voicemail.tsx -> length 3 -> depth 1 -> '../config/api'
        let imp = configImport;
        if (relDepth === 1) imp = configImportRoot;
        if (relDepth === 3) imp = configImportDeep;
        
        // Add import at the top (after first line imports)
        const lines = content.split('\n');
        lines.splice(1, 0, imp);
        content = lines.join('\n');
        
        // Replace all occurrences
        content = content.replace(/http:\/\/localhost:5000/g, '${API_BASE_URL}');
        
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}

replaceUrls('src');
console.log('Done replacement!');

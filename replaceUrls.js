const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo' && file !== 'dist') {
        replaceInDir(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('http://localhost:5000')) {
        // Replace all instances of `http://localhost:5000` inside backticks
        content = content.replace(/`http:\/\/localhost:5000(.*?)`/g, '`${process.env.EXPO_PUBLIC_API_URL || \'http://localhost:5000\'}$1`');
        
        // Replace all instances of "http://localhost:5000" in double quotes
        content = content.replace(/"http:\/\/localhost:5000(.*?)"/g, '`${process.env.EXPO_PUBLIC_API_URL || \'http://localhost:5000\'}$1`');
        
        fs.writeFileSync(fullPath, content);
        console.log('Updated:', fullPath);
      }
    }
  }
}

replaceInDir('c:/Users/pranesh.S.S/OneDrive/testing website/cloned_repositories/repo_1780728872145/myntra');

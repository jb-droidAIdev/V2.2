const fs = require('fs');
const path = require('path');

const dossierPath = 'c:\\Users\\24642\\Desktop\\V2\\frontend\\app\\(dashboard)\\dossier\\DossierContent.tsx';

if (fs.existsSync(dossierPath)) {
    let content = fs.readFileSync(dossierPath, 'utf8');
    
    // 1. Fix fetchData permission check
    content = content.replace(
        /if \(role === 'ADMIN' \|\| perms\.includes\('USER_MANAGE'\)\) {/,
        "if (role === 'ADMIN' || perms.includes('USER_MANAGE') || perms.includes('*')) {"
    );
    
    // 2. Fix campaign creation button
    content = content.replace(
        /\{viewMode === 'users' && \(permissions\.includes\('CAMPAIGN_MANAGE'\) \|\| userRole === 'ADMIN'\) && \(/,
        "{viewMode === 'users' && (permissions.includes('CAMPAIGN_MANAGE') || permissions.includes('*') || userRole === 'ADMIN') && ("
    );
    
    // 3. Fix manage button and import/add
    content = content.replace(
        /\{\(permissions\.includes\('USER_MANAGE'\) \|\| userRole === 'ADMIN'\) && \(/,
        "{(permissions.includes('USER_MANAGE') || permissions.includes('*') || userRole === 'ADMIN') && ("
    );
    
    // 4. Fix filter logic
    content = content.replace(
        /if \(viewMode === 'admin'\) \{\r?\n\s+\/\/ Include management roles OR users with NO assigned role \(Unassigned Non-Agents\)\r?\n\s+const managementRoles = \[.*?\];\r?\n\s+return managementRoles\.includes\(user\.role\) \|\| !user\.role \|\| user\.role === '';\r?\n\s+\}/,
        `if (viewMode === 'admin') {
  // Include all non-agent roles or users with no assigned role
  return user.role !== 'AGENT' || !user.role || user.role === '';
  }`
    );

    fs.writeFileSync(dossierPath, content);
    console.log('Fixed DossierContent.tsx');
} else {
    console.log('DossierContent.tsx not found');
}

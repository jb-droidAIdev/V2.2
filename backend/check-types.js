
const { Prisma } = require('@prisma/client');
console.log('Audit include options:', Object.keys(Prisma.AuditScalarFieldEnum));
// Actually, include is not easily accessible via runtime keys like this.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOptions() {
  const user = { id: 'cluser123', role: 'ADMIN', employeeTeam: null };
  const filters = {};
  
  const normalizeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    if (typeof val === 'string' && val.includes(',')) {
      return val.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [String(val).trim()].filter(Boolean);
  };

  const activeCampaigns = normalizeArray(filters.campaignId);
  const activeSupervisors = normalizeArray(filters.supervisor);
  const activeSdms = normalizeArray(filters.sdm);
  const activeAuditors = normalizeArray(filters.auditorId);

  const role = user.role;
  const isStaff = role !== 'AGENT';
  // Check the exact array from dashboard.service.ts
  const isManagerRestricted = [
        'QA_TL',
        'QATL',
        'OPS_TL',
        'OPSTL',
        'OPS_MANAGER',
        'OPSMANAGER',
        'SDM',
        'QA',
      ].includes(role);

  const visibilityFilter = {};
  let assignedIds = ['c0'];

  // Cascading logic for Agents visibility
  if (isManagerRestricted) {
    const campaignIdsToUse = activeCampaigns.length > 0
        ? assignedIds.filter(id => activeCampaigns.includes(id) || activeCampaigns.includes(`TEAM:${id}`)) 
        : assignedIds;
    if (activeCampaigns.length > 0 && campaignIdsToUse.length === 0) {
      visibilityFilter.auditsReceived = { some: { campaignId: { in: [] } } };
    } else {
      visibilityFilter.auditsReceived = { some: { campaignId: { in: campaignIdsToUse } } };
    }
  } else {
    const campaignConditions = [];
    if (activeCampaigns.length > 0) {
        const teamNames = activeCampaigns.filter(id => id.startsWith('TEAM:')).map(id => id.replace('TEAM:', ''));
        const realIds = activeCampaigns.filter(id => !id.startsWith('TEAM:'));
        if (realIds.length > 0) campaignConditions.push({ auditsReceived: { some: { campaignId: { in: realIds } } } });
        if (teamNames.length > 0) campaignConditions.push({ employeeTeam: { in: teamNames } });
    }
    
    if (campaignConditions.length > 1) {
      visibilityFilter.OR = campaignConditions;
    } else if (campaignConditions.length === 1) {
      Object.assign(visibilityFilter, campaignConditions[0]);
    } else {
      visibilityFilter.auditsReceived = { some: {} };
    }
  }

  if (activeSupervisors.length > 0) visibilityFilter.supervisor = { in: activeSupervisors };
  if (activeSdms.length > 0) visibilityFilter.sdm = { in: activeSdms };

  const campaignFilter = { type: 'USER', audits: { some: {} } };
  if (isManagerRestricted) {
    campaignFilter.qaAssignments = {
      some: { userId: user.id, isActive: true },
    };
  } else if (!isStaff) {
    campaignFilter.OR = [
      { qaAssignments: { some: { userId: user.id } } },
      { name: user.employeeTeam || 'NON_EXISTENT' }, 
    ];
  }

  try {
    console.log('QUERY 1 campaigns');
    const campaigns = await prisma.campaign.findMany({
      where: campaignFilter,
      select: { id: true, name: true }
    });
    console.log('QUERY 2 supervisorsRaw');
    const supervisorsRaw = await prisma.user.findMany({
      where: {
        supervisor: { not: null },
        ...(!isStaff || isManagerRestricted || activeCampaigns.length > 0 || activeSdms.length > 0 ? visibilityFilter : {}),
      },
      select: { supervisor: true }
    });
    console.log('QUERY 3 sdmsRaw');
    const sdmsRaw = await prisma.user.findMany({
      where: {
        sdm: { not: null },
        ...(!isStaff || isManagerRestricted || activeCampaigns.length > 0 ? visibilityFilter : {}),
      },
      select: { sdm: true }
    });
    console.log('QUERY 4 userTeams');
    const userTeams = await prisma.user.findMany({
      where: {
        auditsReceived: visibilityFilter.auditsReceived || { some: {} },
        ...(!isStaff ? { employeeTeam: user.employeeTeam || 'NON_EXISTENT' } : {}),
      },
      select: { employeeTeam: true },
      distinct: ['employeeTeam'],
    });
    
    console.log('QUERY 5 auditedAgents');
    const auditedAgents = await prisma.user.findMany({
        where: {
          role: 'AGENT',
          ...(!isStaff || isManagerRestricted || activeCampaigns.length > 0 || activeSupervisors.length > 0 || activeSdms.length > 0 ? visibilityFilter : { auditsReceived: { some: {} } }),
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      
    console.log('QUERY 6 qas');
    const qaFilter = { role: { in: ['QA', 'QA_TL'] } };
      if (activeCampaigns.length > 0) {
         const realIds = activeCampaigns.filter(id => !id.startsWith('TEAM:'));
         if (realIds.length > 0) {
            qaFilter.auditsPerformed = { some: { campaignId: { in: realIds } } };
         }
      }

      const qas = await prisma.user.findMany({
        where: qaFilter,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

    console.log('success!');
  } catch (e) {
    console.error('ERROR PRISMA:', e.message);
  }
}

testOptions().finally(() => window?null:prisma.$disconnect());

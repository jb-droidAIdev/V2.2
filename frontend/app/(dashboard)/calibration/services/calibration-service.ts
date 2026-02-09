import api from '@/lib/api';

export interface CalibrationSession {
    id: string;
    campaignId: string;
    title: string;
    description?: string;
    scheduledAt: string;
    status: CalibrationSessionStatus;
    avgReproducibility?: number;
    avgRepeatability?: number;
    totalRange?: number;
    calculatedRnR?: number;
    avgAccuracyGap?: number;
    targetRnR?: number;
    targetAccuracy?: number;
    _count?: {
        participants: number;
        tickets: number;
        scores: number;
    };
    participants?: CalibrationParticipant[];
    tickets?: CalibrationTicket[];
    anchors?: CalibrationAnchor[];
    results?: CalibrationResult[];
}

export type CalibrationSessionStatus =
    | 'SCHEDULED'
    | 'ANCHOR_PENDING'
    | 'SCORING_OPEN'
    | 'SCORING_CLOSED'
    | 'COMPLETED'
    | 'CANCELLED';

export interface CalibrationParticipant {
    id: string;
    userId: string;
    role: 'RATER' | 'QA_TL' | 'AM_SDM';
    hasCompletedScoring: boolean;
    completedAt?: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface CalibrationTicket {
    id: string;
    ticketId: string;
    type: 'REPRODUCIBILITY' | 'REPEATABILITY' | 'ACCURACY';
    scoreRange?: string;
    metadata?: any;
    scores?: CalibrationScore[];
}

export interface CalibrationScore {
    id: string;
    totalScore: number;
    scoreDetails: any;
    participantId: string;
}

export interface CalibrationAnchor {
    id: string;
    auditId: string;
    scoreRange: string;
    score: number;
    status: 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED' | 'NON_MATCHING';
    qaTlApproved?: boolean;
    amSdmApproved?: boolean;
    rejectionReason?: string;
}

export interface CalibrationResult {
    id: string;
    userId?: string;
    avgReproducibility?: number;
    avgRepeatability?: number;
    calculatedRnR?: number;
    avgAccuracyGap?: number;
    passedRnR?: boolean;
    passedAccuracy?: boolean;
}

export interface CreateCalibrationSessionDto {
    campaignId: string;
    title: string;
    description?: string;
    scheduledAt: string;
    reproducibilityTicketCount: number;
    repeatabilityTicketCount: number;
    accuracyTicketCount: number;
    highScoreMin: number;
    highScoreMax: number;
    midScoreMin: number;
    midScoreMax: number;
    lowScoreMin: number;
    lowScoreMax: number;
    targetRnR: number;
    targetAccuracy: number;
    raterUserIds: string[];
    qaTlUserId: string;
    amSdmUserId: string;
}

export const CalibrationService = {
    // Sessions
    getSessions: async (params?: any) => {
        const res = await api.get('/calibration/sessions', { params });
        return res.data;
    },

    getSessionById: async (id: string) => {
        const res = await api.get(`/calibration/sessions/${id}`);
        return res.data;
    },

    createSession: async (data: CreateCalibrationSessionDto) => {
        const res = await api.post('/calibration/sessions', data);
        return res.data;
    },

    updateSession: async (id: string, data: Partial<CreateCalibrationSessionDto>) => {
        const res = await api.put(`/calibration/sessions/${id}`, data);
        return res.data;
    },

    deleteSession: async (id: string) => {
        await api.delete(`/calibration/sessions/${id}`);
    },

    // Randomization
    randomizeTickets: async (sessionId: string) => {
        await api.post(`/calibration/sessions/${sessionId}/randomize`);
    },

    // Anchors
    validateAnchor: async (anchorId: string, approved: boolean, rejectionReason?: string) => {
        const res = await api.post(`/calibration/anchors/${anchorId}/validate`, {
            approved,
            rejectionReason
        });
        return res.data;
    },

    getSessionAnchors: async (sessionId: string) => {
        const res = await api.get(`/calibration/sessions/${sessionId}/anchors`);
        return res.data;
    },

    // Scoring
    getSessionTickets: async (sessionId: string) => {
        const res = await api.get(`/calibration/sessions/${sessionId}/tickets`);
        return res.data;
    },

    submitScore: async (data: { sessionId: string; ticketId: string; totalScore: number; scoreDetails: any }) => {
        const res = await api.post('/calibration/scores', data);
        return res.data;
    },

    // Results
    calculateResults: async (sessionId: string) => {
        const res = await api.post(`/calibration/sessions/${sessionId}/calculate`);
        return res.data;
    },

    getSessionResults: async (sessionId: string) => {
        const res = await api.get(`/calibration/sessions/${sessionId}/results`);
        return res.data;
    },

    // User Tasks
    getMyTasks: async (status?: string) => {
        const res = await api.get('/calibration/my-tasks', { params: { status } });
        return res.data;
    },

    getMyTaskDetails: async (sessionId: string) => {
        const res = await api.get(`/calibration/my-tasks/${sessionId}`);
        return res.data;
    }
};

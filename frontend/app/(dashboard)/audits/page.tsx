'use client';

import { useState, useEffect } from 'react';
import {
    ClipboardCheck,
    Download
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import AuditFilterBar from './components/AuditFilterBar';
import AuditTable from './components/AuditTable';
import AuditPreviewModal from './components/AuditPreviewModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import PromptModal from '@/components/modals/PromptModal';

export default function AuditsPage() {
    const [audits, setAudits] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [previewTarget, setPreviewTarget] = useState<any>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // Dispute specific state
    const [disputeInfo, setDisputeInfo] = useState<any>(null);
    const [isFilingDispute, setIsFilingDispute] = useState(false);
    const [disputeForm, setDisputeForm] = useState<Record<string, string>>({}); // criterionId -> reason
    const [isSubmittingVerdict, setIsSubmittingVerdict] = useState(false);

    // Filter state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        campaign: '',
        dateFrom: '',
        dateTo: ''
    });

    const [promptConfig, setPromptConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        placeholder?: string;
        onSubmit: (val: string) => void;
        minLength?: number;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onSubmit: () => { }
    });

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
        }
        fetchAudits();
    }, []);

    const fetchAudits = async () => {
        try {
            const response = await api.get('/audits');
            setAudits(response.data);
        } catch (err) {
            console.error('Failed to fetch audits:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadExcel = () => {
        if (filteredAudits.length === 0) {
            toast.error('No data to export');
            return;
        }

        const dataToExport = filteredAudits.map(audit => ({
            'Reference': audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'N/A',
            'Internal ID': audit.id,
            'Agent Name': audit.agent.name,
            'Agent EID': audit.agent.eid,
            'Auditor': audit.auditor.name,
            'Score (%)': audit.score,
            'Status': audit.status,
            'Campaign': audit.campaign.name,
            'Date': new Date(audit.lastActionAt).toLocaleString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Audits');
        XLSX.writeFile(workbook, `Audits_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Audits exported successfully');
    };

    const onDeleteAudit = (audit: any) => {
        setDeleteTarget(audit);
        const ticketId = audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'Unknown Ticket';
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Audit',
            message: (
                <span>
                    Are you sure you want to delete the audit for Ticket <strong className="text-rose-400">{ticketId}</strong>? This action is permanent.
                </span>
            ),
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/audits/${audit.id}`);
                    toast.success('Audit deleted successfully');
                    setDeleteTarget(null);
                    fetchAudits();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to delete audit');
                }
            }
        });
    };

    const handlePreviewAudit = async (id: string) => {
        setIsLoadingPreview(true);
        setDisputeInfo(null);
        setIsFilingDispute(false);
        setDisputeForm({});
        try {
            const res = await api.get(`/audits/${id}`);
            setPreviewTarget(res.data);

            // Check for existing dispute
            try {
                const disputeRes = await api.get(`/disputes/audit/${id}`);
                setDisputeInfo(disputeRes.data);
            } catch (e) {
                // No dispute found, clear state
                setDisputeInfo(null);
            }
        } catch (err: any) {
            toast.error('Failed to load audit details');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleRaiseDispute = async () => {
        const items = Object.entries(disputeForm).map(([criterionId, reason]) => ({
            criterionId,
            reason
        }));

        if (items.length === 0) {
            toast.error('Please select at least one item to dispute');
            return;
        }

        // Validate lengths
        for (const item of items) {
            if ((item.reason as string).length < 30) {
                toast.error('All dispute reasons must be at least 30 characters');
                return;
            }
        }

        try {
            await api.post('/disputes', {
                auditId: previewTarget.id,
                items
            });
            toast.success('Dispute raised successfully');
            setIsFilingDispute(false);
            handlePreviewAudit(previewTarget.id); // Reload
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to raise dispute');
        }
    };

    const handleVerdict = async (itemId: string, verdict: string, stage: 'qa' | 'final') => {
        if (isSubmittingVerdict) return;

        const stageTitle = stage === 'qa' ? 'QA Verdict' : 'Final Verdict';
        const message = verdict === 'ACCEPTED'
            ? 'Provide a note for this acceptance (optional).'
            : 'Provide a reason for rejection (required).';

        setPromptConfig({
            isOpen: true,
            title: stageTitle,
            message: message,
            placeholder: 'Type your feedback here...',
            minLength: verdict === 'REJECTED' ? 10 : 0,
            onSubmit: async (comment) => {
                let endpoint = `/disputes/item/${itemId}/verdict`;
                let payload: any = { verdict };

                if (stage === 'qa') {
                    payload.comment = comment;
                } else {
                    endpoint = `/disputes/item/${itemId}/final-verdict`;
                    payload.comment = comment;
                }

                setIsSubmittingVerdict(true);
                try {
                    await api.post(endpoint, payload);
                    toast.success('Verdict submitted');
                    handlePreviewAudit(previewTarget.id);
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to submit verdict');
                } finally {
                    setIsSubmittingVerdict(false);
                }
            }
        });
    };

    const handleReappealSubmission = async () => {
        setPromptConfig({
            isOpen: true,
            title: 'File Re-appeal',
            message: 'Explain why you are appealing this decision. This will escalate the audit to Admin review.',
            placeholder: 'Re-appeal reason (min 30 characters)...',
            minLength: 30,
            onSubmit: async (reason) => {
                try {
                    await api.post(`/disputes/${disputeInfo.id}/reappeal`, { reappealReason: reason });
                    toast.success('Re-appeal filed successfully');
                    handlePreviewAudit(previewTarget.id);
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to re-appeal');
                }
            }
        });
    };

    const filteredAudits = audits.filter(audit => {
        const matchesSearch =
            audit.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            audit.auditor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = !filters.status || audit.status === filters.status;
        const matchesCampaign = !filters.campaign || audit.campaign?.name === filters.campaign;

        let matchesDate = true;
        if (filters.dateFrom || filters.dateTo) {
            const auditDate = new Date(audit.lastActionAt);
            if (filters.dateFrom) {
                const from = new Date(filters.dateFrom);
                if (auditDate < from) matchesDate = false;
            }
            if (filters.dateTo) {
                const to = new Date(filters.dateTo);
                to.setHours(23, 59, 59, 999);
                if (auditDate > to) matchesDate = false;
            }
        }

        return matchesSearch && matchesStatus && matchesCampaign && matchesDate;
    });

    const campaigns = Array.from(new Set(audits.map(a => a.campaign?.name).filter(Boolean)));

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header section with branding and actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-blue-400">
                        <ClipboardCheck className="w-6 h-6" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Quality Assurance</h2>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">Audits</h1>
                    <p className="text-slate-400 font-medium">Review and manage all completed and ongoing evaluation records.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadExcel}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all border border-white/10"
                        title="Download Data"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <AuditFilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                filters={filters}
                setFilters={setFilters}
                campaigns={campaigns}
                totalCount={filteredAudits.length}
            />

            <AuditTable
                audits={filteredAudits}
                isLoading={isLoading}
                userRole={userRole}
                onPreview={handlePreviewAudit}
                onDelete={onDeleteAudit}
                isLoadingPreview={isLoadingPreview}
            />

            <AuditPreviewModal
                previewTarget={previewTarget}
                onClose={() => setPreviewTarget(null)}
                userRole={userRole}
                disputeInfo={disputeInfo}
                isFilingDispute={isFilingDispute}
                setIsFilingDispute={setIsFilingDispute}
                disputeForm={disputeForm}
                setDisputeForm={setDisputeForm}
                onRaiseDispute={handleRaiseDispute}
                onVerdict={handleVerdict}
                onReappeal={handleReappealSubmission}
            />

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
            />

            <PromptModal
                isOpen={promptConfig.isOpen}
                onClose={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
                onSubmit={promptConfig.onSubmit}
                title={promptConfig.title}
                message={promptConfig.message}
                placeholder={promptConfig.placeholder}
                minLength={promptConfig.minLength}
            />
        </div>
    );
}

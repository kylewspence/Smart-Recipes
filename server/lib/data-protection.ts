import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../db/db';
import { logSecurityEvent } from './security-audit';

export enum DataProcessingPurpose {
    AUTHENTICATION = 'authentication',
    SERVICE_DELIVERY = 'service_delivery',
    ANALYTICS = 'analytics',
    MARKETING = 'marketing',
    SECURITY = 'security',
    LEGAL_COMPLIANCE = 'legal_compliance'
}

export enum LegalBasis {
    CONSENT = 'consent',
    CONTRACT = 'contract',
    LEGAL_OBLIGATION = 'legal_obligation',
    VITAL_INTERESTS = 'vital_interests',
    PUBLIC_TASK = 'public_task',
    LEGITIMATE_INTERESTS = 'legitimate_interests'
}

export interface PrivacyRequest {
    id: string;
    userId: number;
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    requestDate: Date;
    completionDate?: Date;
    requestDetails?: string;
    responseData?: any;
    verificationMethod: string;
}

const consentSchema = z.object({
    userId: z.number(),
    purpose: z.nativeEnum(DataProcessingPurpose),
    consentGiven: z.boolean(),
    consentDate: z.date().optional().default(() => new Date())
});

export class DataProtectionService {
    public async updateConsent(userId: number, purpose: DataProcessingPurpose, consentGiven: boolean): Promise<void> {
        try {
            const validatedData = consentSchema.parse({
                userId,
                purpose,
                consentGiven
            });

            console.log(`Consent updated for user ${userId}, purpose: ${purpose}, granted: ${consentGiven}`);
        } catch (error) {
            console.error('Failed to update consent:', error);
            throw new Error('Failed to update consent');
        }
    }

    public async getUserConsents(userId: number): Promise<Record<DataProcessingPurpose, boolean>> {
        try {
            const consents: Record<string, boolean> = {};
            
            Object.values(DataProcessingPurpose).forEach(purpose => {
                consents[purpose] = true;
            });

            return consents as Record<DataProcessingPurpose, boolean>;
        } catch (error) {
            console.error('Failed to get user consents:', error);
            throw new Error('Failed to retrieve user consents');
        }
    }

    public async exportUserData(userId: number): Promise<any> {
        try {
            const userData = {
                personalData: { id: userId, email: 'user@example.com', name: 'User Name' },
                recipes: [],
                preferences: {},
                exportDate: new Date().toISOString(),
                format: 'JSON'
            };

            return userData;
        } catch (error) {
            console.error('Failed to export user data:', error);
            throw new Error('Failed to export user data');
        }
    }
}

export const dataProtectionService = new DataProtectionService();

export const updateUserConsent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { purpose, consentGiven } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }

        await dataProtectionService.updateConsent(userId, purpose, consentGiven);

        await logSecurityEvent(req, 'medium', 'CONSENT_UPDATED', {
            userId,
            purpose,
            consentGiven
        });

        res.json({
            success: true,
            message: 'Consent updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update consent'
        });
    }
};

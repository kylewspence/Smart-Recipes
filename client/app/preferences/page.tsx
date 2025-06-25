import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import OnboardingFlow from '@/components/preferences/OnboardingFlow';

export default function PreferencesPage() {
    return (
        <ProtectedRoute>
            <OnboardingFlow />
        </ProtectedRoute>
    );
} 
import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import PreferenceManager from '@/components/preferences/PreferenceManager';

export default function PreferenceManagePage() {
    return (
        <ProtectedRoute>
            <PreferenceManager />
        </ProtectedRoute>
    );
} 
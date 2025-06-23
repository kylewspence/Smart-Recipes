import { Metadata } from 'next';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata: Metadata = {
    title: 'Dashboard - Smart Recipes',
    description: 'Your personalized recipe dashboard with AI-powered meal recommendations.',
};

export default function DashboardPage() {
    return <DashboardContent />;
} 
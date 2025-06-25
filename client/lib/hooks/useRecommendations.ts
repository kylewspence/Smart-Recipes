'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    recommendationsService,
    PersonalizedRecommendationsResponse,
    SimilarRecipesResponse,
    TrendingRecipesResponse,
    SeasonalRecommendationsResponse
} from '../services/recommendations';

interface UseRecommendationsOptions {
    userId?: number;
    recipeId?: number;
    limit?: number;
    autoFetch?: boolean;
}

interface UseRecommendationsReturn {
    // Data
    personalizedRecommendations: PersonalizedRecommendationsResponse | null;
    similarRecipes: SimilarRecipesResponse | null;
    trendingRecipes: TrendingRecipesResponse | null;
    seasonalRecommendations: SeasonalRecommendationsResponse | null;
    quickRecommendations: any[] | null;

    // Loading states
    isLoadingPersonalized: boolean;
    isLoadingSimilar: boolean;
    isLoadingTrending: boolean;
    isLoadingSeasonal: boolean;
    isLoadingQuick: boolean;

    // Error states
    personalizedError: string | null;
    similarError: string | null;
    trendingError: string | null;
    seasonalError: string | null;
    quickError: string | null;

    // Actions
    fetchPersonalizedRecommendations: (userId: number, limit?: number) => Promise<void>;
    fetchSimilarRecipes: (recipeId: number, limit?: number) => Promise<void>;
    fetchTrendingRecipes: (limit?: number) => Promise<void>;
    fetchSeasonalRecommendations: (limit?: number) => Promise<void>;
    fetchQuickRecommendations: (limit?: number) => Promise<void>;
    clearRecommendations: () => void;
}

export function useRecommendations(options: UseRecommendationsOptions = {}): UseRecommendationsReturn {
    const { userId, recipeId, limit = 10, autoFetch = false } = options;

    // Data states
    const [personalizedRecommendations, setPersonalizedRecommendations] = useState<PersonalizedRecommendationsResponse | null>(null);
    const [similarRecipes, setSimilarRecipes] = useState<SimilarRecipesResponse | null>(null);
    const [trendingRecipes, setTrendingRecipes] = useState<TrendingRecipesResponse | null>(null);
    const [seasonalRecommendations, setSeasonalRecommendations] = useState<SeasonalRecommendationsResponse | null>(null);
    const [quickRecommendations, setQuickRecommendations] = useState<any[] | null>(null);

    // Loading states
    const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);
    const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
    const [isLoadingTrending, setIsLoadingTrending] = useState(false);
    const [isLoadingSeasonal, setIsLoadingSeasonal] = useState(false);
    const [isLoadingQuick, setIsLoadingQuick] = useState(false);

    // Error states
    const [personalizedError, setPersonalizedError] = useState<string | null>(null);
    const [similarError, setSimilarError] = useState<string | null>(null);
    const [trendingError, setTrendingError] = useState<string | null>(null);
    const [seasonalError, setSeasonalError] = useState<string | null>(null);
    const [quickError, setQuickError] = useState<string | null>(null);

    // Fetch personalized recommendations
    const fetchPersonalizedRecommendations = useCallback(async (userId: number, limit: number = 10) => {
        setIsLoadingPersonalized(true);
        setPersonalizedError(null);

        try {
            const data = await recommendationsService.getPersonalizedRecommendations(userId, limit);
            setPersonalizedRecommendations(data);
        } catch (error) {
            setPersonalizedError(error instanceof Error ? error.message : 'Failed to fetch personalized recommendations');
        } finally {
            setIsLoadingPersonalized(false);
        }
    }, []);

    // Fetch similar recipes
    const fetchSimilarRecipes = useCallback(async (recipeId: number, limit: number = 5) => {
        setIsLoadingSimilar(true);
        setSimilarError(null);

        try {
            const data = await recommendationsService.getSimilarRecipes(recipeId, limit);
            setSimilarRecipes(data);
        } catch (error) {
            setSimilarError(error instanceof Error ? error.message : 'Failed to fetch similar recipes');
        } finally {
            setIsLoadingSimilar(false);
        }
    }, []);

    // Fetch trending recipes
    const fetchTrendingRecipes = useCallback(async (limit: number = 10) => {
        setIsLoadingTrending(true);
        setTrendingError(null);

        try {
            const data = await recommendationsService.getTrendingRecipes(limit);
            setTrendingRecipes(data);
        } catch (error) {
            setTrendingError(error instanceof Error ? error.message : 'Failed to fetch trending recipes');
        } finally {
            setIsLoadingTrending(false);
        }
    }, []);

    // Fetch seasonal recommendations
    const fetchSeasonalRecommendations = useCallback(async (limit: number = 10) => {
        setIsLoadingSeasonal(true);
        setSeasonalError(null);

        try {
            const data = await recommendationsService.getSeasonalRecommendations(limit);
            setSeasonalRecommendations(data);
        } catch (error) {
            setSeasonalError(error instanceof Error ? error.message : 'Failed to fetch seasonal recommendations');
        } finally {
            setIsLoadingSeasonal(false);
        }
    }, []);

    // Fetch quick recommendations
    const fetchQuickRecommendations = useCallback(async (limit: number = 6) => {
        setIsLoadingQuick(true);
        setQuickError(null);

        try {
            const data = await recommendationsService.getQuickRecommendations(limit);
            setQuickRecommendations(data);
        } catch (error) {
            setQuickError(error instanceof Error ? error.message : 'Failed to fetch quick recommendations');
        } finally {
            setIsLoadingQuick(false);
        }
    }, []);

    // Clear all recommendations
    const clearRecommendations = useCallback(() => {
        setPersonalizedRecommendations(null);
        setSimilarRecipes(null);
        setTrendingRecipes(null);
        setSeasonalRecommendations(null);
        setQuickRecommendations(null);

        setPersonalizedError(null);
        setSimilarError(null);
        setTrendingError(null);
        setSeasonalError(null);
        setQuickError(null);
    }, []);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            if (userId) {
                fetchPersonalizedRecommendations(userId, limit);
            }
            if (recipeId) {
                fetchSimilarRecipes(recipeId, limit);
            }
            fetchQuickRecommendations(6);
        }
    }, [autoFetch, userId, recipeId, limit, fetchPersonalizedRecommendations, fetchSimilarRecipes, fetchQuickRecommendations]);

    return {
        // Data
        personalizedRecommendations,
        similarRecipes,
        trendingRecipes,
        seasonalRecommendations,
        quickRecommendations,

        // Loading states
        isLoadingPersonalized,
        isLoadingSimilar,
        isLoadingTrending,
        isLoadingSeasonal,
        isLoadingQuick,

        // Error states
        personalizedError,
        similarError,
        trendingError,
        seasonalError,
        quickError,

        // Actions
        fetchPersonalizedRecommendations,
        fetchSimilarRecipes,
        fetchTrendingRecipes,
        fetchSeasonalRecommendations,
        fetchQuickRecommendations,
        clearRecommendations,
    };
} 
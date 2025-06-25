'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, X, Clock, TrendingUp, ChefHat } from 'lucide-react';
import { searchService, SearchSuggestion } from '../../lib/services/search';
import { useDebounce } from '../../lib/hooks/useDebounce';

interface EnhancedSearchBarProps {
    onSearch: (query: string, filters?: any) => void;
    onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    placeholder?: string;
    showFilters?: boolean;
    showTrending?: boolean;
    autoFocus?: boolean;
    className?: string;
}

interface SearchFilters {
    fuzzy: boolean;
    cuisine: string[];
    difficulty: string[];
    maxCookingTime?: number;
    spiceLevel: string[];
}

export default function EnhancedSearchBar({
    onSearch,
    onSuggestionSelect,
    placeholder = "Search recipes, ingredients, or cuisines...",
    showFilters = true,
    showTrending = true,
    autoFocus = false,
    className = ""
}: EnhancedSearchBarProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Record<string, SearchSuggestion[]>>({});
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [trending, setTrending] = useState<any>(null);
    const [filters, setFilters] = useState<SearchFilters>({
        fuzzy: true,
        cuisine: [],
        difficulty: [],
        maxCookingTime: undefined,
        spiceLevel: []
    });

    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(query, 300);

    // Load trending content on mount
    useEffect(() => {
        if (showTrending) {
            searchService.getTrending({ days: 7, limit: 5 })
                .then(setTrending)
                .catch((error) => {
                    console.warn('Failed to load trending content:', error);
                    // Fail silently - trending content is not critical
                });
        }
    }, [showTrending]);

    // Fetch suggestions when query changes
    useEffect(() => {
        if (debouncedQuery.length >= 2) {
            setIsLoading(true);
            searchService.getSuggestions(debouncedQuery, {
                type: 'all',
                limit: 8,
                includePopular: true
            }).then(result => {
                setSuggestions(result.suggestions);
                setShowSuggestions(true);
                setIsLoading(false);
            }).catch((error) => {
                console.warn('Failed to load search suggestions:', error);
                setIsLoading(false);
                setSuggestions({});
                setShowSuggestions(false);
            });
        } else if (debouncedQuery.length === 0) {
            // Show popular searches when no query
            searchService.getSuggestions('', {
                includePopular: true,
                limit: 5
            }).then(result => {
                setSuggestions(result.suggestions);
                setShowSuggestions(true);
            }).catch((error) => {
                console.warn('Failed to load popular searches:', error);
                // Fail silently - popular searches are not critical
            });
        } else {
            setSuggestions({});
            setShowSuggestions(false);
        }
    }, [debouncedQuery]);

    // Handle clicks outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
                searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = useCallback((searchQuery: string = query) => {
        if (searchQuery.trim()) {
            onSearch(searchQuery, filters);
            setShowSuggestions(false);
        }
    }, [query, filters, onSearch]);

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
        const searchTerm = suggestion.title || suggestion.name || '';
        setQuery(searchTerm);
        setShowSuggestions(false);

        if (onSuggestionSelect) {
            onSuggestionSelect(suggestion);
        } else {
            onSearch(searchTerm, filters);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const clearQuery = () => {
        setQuery('');
        setSuggestions({});
        setShowSuggestions(false);
        searchInputRef.current?.focus();
    };

    const toggleFilter = (filterType: keyof SearchFilters, value: string) => {
        setFilters(prev => {
            const currentArray = prev[filterType] as string[];
            const newArray = currentArray.includes(value)
                ? currentArray.filter(item => item !== value)
                : [...currentArray, value];

            return { ...prev, [filterType]: newArray };
        });
    };

    const renderSuggestionGroup = (title: string, suggestions: SearchSuggestion[], icon: React.ReactNode) => {
        if (!suggestions?.length) return null;

        return (
            <div className="py-2">
                <div className="flex items-center gap-2 px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {icon}
                    {title}
                </div>
                {suggestions.map((suggestion, index) => (
                    <button
                        key={`${suggestion.type}-${index}`}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                        onClick={() => handleSuggestionClick(suggestion)}
                    >
                        <span className="text-gray-900">
                            {suggestion.title || suggestion.name}
                        </span>
                        {suggestion.search_count && (
                            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {suggestion.search_count} searches
                            </span>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className={`relative ${className}`}>
            {/* Main Search Input */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>

                <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />

                <div className="absolute inset-y-0 right-0 flex items-center">
                    {query && (
                        <button
                            onClick={clearQuery}
                            className="p-1 mr-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {showFilters && (
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`p-2 mr-2 rounded-md transition-colors ${showFilterPanel || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f)
                                ? 'text-blue-600 bg-blue-50'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <Filter className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Fuzzy Search Toggle */}
                        <div>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={filters.fuzzy}
                                    onChange={(e) => setFilters(prev => ({ ...prev, fuzzy: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Fuzzy Search</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Find results even with typos</p>
                        </div>

                        {/* Cuisine Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cuisine</label>
                            <div className="space-y-1">
                                {['Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean'].map(cuisine => (
                                    <label key={cuisine} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={filters.cuisine.includes(cuisine)}
                                            onChange={() => toggleFilter('cuisine', cuisine)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">{cuisine}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                            <div className="space-y-1">
                                {['easy', 'medium', 'hard'].map(difficulty => (
                                    <label key={difficulty} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={filters.difficulty.includes(difficulty)}
                                            onChange={() => toggleFilter('difficulty', difficulty)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 capitalize">{difficulty}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Cooking Time Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Cooking Time</label>
                            <select
                                value={filters.maxCookingTime || ''}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    maxCookingTime: e.target.value ? parseInt(e.target.value) : undefined
                                }))}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Any time</option>
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="120">2 hours</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 space-x-2">
                        <button
                            onClick={() => setFilters({
                                fuzzy: true,
                                cuisine: [],
                                difficulty: [],
                                maxCookingTime: undefined,
                                spiceLevel: []
                            })}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Clear Filters
                        </button>
                        <button
                            onClick={() => setShowFilterPanel(false)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && (
                <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                    {isLoading ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm">Searching...</p>
                        </div>
                    ) : (
                        <>
                            {renderSuggestionGroup('Recipes', suggestions.recipes || [], <ChefHat className="h-3 w-3" />)}
                            {renderSuggestionGroup('Ingredients', suggestions.ingredients || [], <Search className="h-3 w-3" />)}
                            {renderSuggestionGroup('Cuisines', suggestions.cuisines || [], <TrendingUp className="h-3 w-3" />)}
                            {renderSuggestionGroup('Popular Searches', suggestions.popular || [], <Clock className="h-3 w-3" />)}

                            {Object.keys(suggestions).length === 0 && debouncedQuery && (
                                <div className="px-4 py-8 text-center text-gray-500">
                                    <p className="text-sm">No suggestions found</p>
                                    <p className="text-xs mt-1">Try a different search term</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export { EnhancedSearchBar }; 
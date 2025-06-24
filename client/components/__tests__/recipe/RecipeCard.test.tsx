import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeCard } from '@/components/recipe/RecipeCard'
import { AuthProvider } from '@/lib/contexts/AuthContext'

// Mock the recipe service
jest.mock('@/lib/services/recipe', () => ({
    recipeService: {
        favoriteRecipe: jest.fn(),
        unfavoriteRecipe: jest.fn(),
        isRecipeFavorited: jest.fn(),
    },
}))

const mockRecipe = global.testUtils.createMockRecipe()

const MockedRecipeCard = ({ recipe = mockRecipe, variant = 'default', ...props }) => (
    <AuthProvider>
        <RecipeCard recipe={recipe} variant={variant} {...props} />
    </AuthProvider>
)

describe('RecipeCard', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders recipe information correctly', () => {
        render(<MockedRecipeCard />)

        expect(screen.getByText(mockRecipe.title)).toBeInTheDocument()
        expect(screen.getByText(mockRecipe.description)).toBeInTheDocument()
        expect(screen.getByText(`${mockRecipe.cookingTime} min`)).toBeInTheDocument()
        expect(screen.getByText(`${mockRecipe.servings} servings`)).toBeInTheDocument()
        expect(screen.getByText(mockRecipe.difficulty)).toBeInTheDocument()
        expect(screen.getByText(mockRecipe.cuisine)).toBeInTheDocument()
    })

    it('displays rating correctly', () => {
        render(<MockedRecipeCard />)

        const ratingElement = screen.getByText(mockRecipe.rating.toString())
        expect(ratingElement).toBeInTheDocument()

        // Check for star icons
        const stars = screen.getAllByText('★')
        expect(stars).toHaveLength(Math.floor(mockRecipe.rating))
    })

    it('handles favorite button click when not favorited', async () => {
        const mockFavoriteRecipe = jest.fn().mockResolvedValue(undefined)
        const mockIsRecipeFavorited = jest.fn().mockReturnValue(false)

        const { recipeService } = require('@/lib/services/recipe')
        recipeService.favoriteRecipe.mockImplementation(mockFavoriteRecipe)
        recipeService.isRecipeFavorited.mockImplementation(mockIsRecipeFavorited)

        const user = userEvent.setup()
        render(<MockedRecipeCard />)

        const favoriteButton = screen.getByRole('button', { name: /add to favorites/i })
        await user.click(favoriteButton)

        await waitFor(() => {
            expect(mockFavoriteRecipe).toHaveBeenCalledWith(mockRecipe.id.toString())
        })
    })

    it('handles unfavorite button click when favorited', async () => {
        const mockUnfavoriteRecipe = jest.fn().mockResolvedValue(undefined)
        const mockIsRecipeFavorited = jest.fn().mockReturnValue(true)

        const { recipeService } = require('@/lib/services/recipe')
        recipeService.unfavoriteRecipe.mockImplementation(mockUnfavoriteRecipe)
        recipeService.isRecipeFavorited.mockImplementation(mockIsRecipeFavorited)

        const user = userEvent.setup()
        render(<MockedRecipeCard />)

        const favoriteButton = screen.getByRole('button', { name: /remove from favorites/i })
        await user.click(favoriteButton)

        await waitFor(() => {
            expect(mockUnfavoriteRecipe).toHaveBeenCalledWith(mockRecipe.id.toString())
        })
    })

    it('shows error message when favorite action fails', async () => {
        const mockFavoriteRecipe = jest.fn().mockRejectedValue(new Error('Network error'))
        const mockIsRecipeFavorited = jest.fn().mockReturnValue(false)

        const { recipeService } = require('@/lib/services/recipe')
        recipeService.favoriteRecipe.mockImplementation(mockFavoriteRecipe)
        recipeService.isRecipeFavorited.mockImplementation(mockIsRecipeFavorited)

        const user = userEvent.setup()
        render(<MockedRecipeCard />)

        const favoriteButton = screen.getByRole('button', { name: /add to favorites/i })
        await user.click(favoriteButton)

        await waitFor(() => {
            expect(screen.getByText(/failed to update favorites/i)).toBeInTheDocument()
        })
    })

    it('renders compact variant correctly', () => {
        render(<MockedRecipeCard variant="compact" />)

        expect(screen.getByText(mockRecipe.title)).toBeInTheDocument()
        expect(screen.getByText(`${mockRecipe.cookingTime}m`)).toBeInTheDocument()

        // Description should not be visible in compact mode
        expect(screen.queryByText(mockRecipe.description)).not.toBeInTheDocument()
    })

    it('renders featured variant correctly', () => {
        render(<MockedRecipeCard variant="featured" />)

        expect(screen.getByText(mockRecipe.title)).toBeInTheDocument()
        expect(screen.getByText(mockRecipe.description)).toBeInTheDocument()

        // Featured variant should have special styling
        const cardElement = screen.getByTestId('recipe-card')
        expect(cardElement).toHaveClass('featured')
    })

    it('handles click to view recipe details', async () => {
        const mockOnClick = jest.fn()
        const user = userEvent.setup()

        render(<MockedRecipeCard onClick={mockOnClick} />)

        const cardElement = screen.getByTestId('recipe-card')
        await user.click(cardElement)

        expect(mockOnClick).toHaveBeenCalledWith(mockRecipe)
    })

    it('supports keyboard navigation', async () => {
        const mockOnClick = jest.fn()
        const user = userEvent.setup()

        render(<MockedRecipeCard onClick={mockOnClick} />)

        const cardElement = screen.getByTestId('recipe-card')

        await user.tab()
        expect(cardElement).toHaveFocus()

        await user.keyboard('{Enter}')
        expect(mockOnClick).toHaveBeenCalledWith(mockRecipe)

        await user.keyboard('{Space}')
        expect(mockOnClick).toHaveBeenCalledTimes(2)
    })

    it('displays difficulty badge with correct styling', () => {
        render(<MockedRecipeCard />)

        const difficultyBadge = screen.getByText(mockRecipe.difficulty)
        expect(difficultyBadge).toBeInTheDocument()
        expect(difficultyBadge).toHaveClass('badge', 'difficulty-easy')
    })

    it('handles missing recipe image gracefully', () => {
        const recipeWithoutImage = { ...mockRecipe, image: undefined }
        render(<MockedRecipeCard recipe={recipeWithoutImage} />)

        // Should show placeholder or default image
        const imageElement = screen.getByRole('img')
        expect(imageElement).toHaveAttribute('src', expect.stringContaining('placeholder'))
    })

    it('truncates long descriptions appropriately', () => {
        const recipeWithLongDescription = {
            ...mockRecipe,
            description: 'This is a very long description that should be truncated when displayed in the recipe card to maintain proper layout and readability across different screen sizes and device types.',
        }

        render(<MockedRecipeCard recipe={recipeWithLongDescription} />)

        const descriptionElement = screen.getByText(/this is a very long description/i)
        expect(descriptionElement).toBeInTheDocument()
        expect(descriptionElement).toHaveClass('line-clamp-2')
    })

    it('shows loading state for favorite button', async () => {
        const mockFavoriteRecipe = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
        const mockIsRecipeFavorited = jest.fn().mockReturnValue(false)

        const { recipeService } = require('@/lib/services/recipe')
        recipeService.favoriteRecipe.mockImplementation(mockFavoriteRecipe)
        recipeService.isRecipeFavorited.mockImplementation(mockIsRecipeFavorited)

        const user = userEvent.setup()
        render(<MockedRecipeCard />)

        const favoriteButton = screen.getByRole('button', { name: /add to favorites/i })
        await user.click(favoriteButton)

        expect(favoriteButton).toBeDisabled()
        expect(screen.getByTestId('favorite-loading')).toBeInTheDocument()
    })

    it('applies hover effects correctly', async () => {
        const user = userEvent.setup()
        render(<MockedRecipeCard />)

        const cardElement = screen.getByTestId('recipe-card')

        await user.hover(cardElement)
        expect(cardElement).toHaveClass('hover:shadow-lg')

        await user.unhover(cardElement)
        expect(cardElement).not.toHaveClass('shadow-lg')
    })

    it('renders ingredients count when provided', () => {
        const recipeWithIngredients = {
            ...mockRecipe,
            ingredientCount: 8,
        }

        render(<MockedRecipeCard recipe={recipeWithIngredients} />)

        expect(screen.getByText('8 ingredients')).toBeInTheDocument()
    })

    it('handles accessibility attributes correctly', () => {
        render(<MockedRecipeCard />)

        const cardElement = screen.getByTestId('recipe-card')
        expect(cardElement).toHaveAttribute('role', 'article')
        expect(cardElement).toHaveAttribute('tabindex', '0')

        const favoriteButton = screen.getByRole('button', { name: /add to favorites/i })
        expect(favoriteButton).toHaveAttribute('aria-label')
        expect(favoriteButton).toHaveAttribute('title')
    })
}) 
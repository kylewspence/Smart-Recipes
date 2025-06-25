import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthProvider } from '@/lib/contexts/AuthContext'

// Mock the auth service
jest.mock('@/lib/services/auth', () => ({
    authService: {
        login: jest.fn(),
    },
}))

const MockedLoginForm = () => (
    <AuthProvider>
        <LoginForm />
    </AuthProvider>
)

describe('LoginForm', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders login form with all required fields', () => {
        render(<MockedLoginForm />)

        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
        expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    })

    it('shows validation errors for empty fields', async () => {
        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const submitButton = screen.getByRole('button', { name: /sign in/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/email is required/i)).toBeInTheDocument()
            expect(screen.getByText(/password is required/i)).toBeInTheDocument()
        })
    })

    it('shows validation error for invalid email format', async () => {
        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })

        await user.type(emailInput, 'invalid-email')
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
        })
    })

    it('shows validation error for short password', async () => {
        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })

        await user.type(passwordInput, '123')
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
        })
    })

    it('submits form with valid credentials', async () => {
        const mockLogin = jest.fn().mockResolvedValue({
            user: global.testUtils.createMockUser(),
            token: 'mock-token',
        })

        const { authService } = require('@/lib/services/auth')
        authService.login.mockImplementation(mockLogin)

        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })

        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'password123')
        await user.click(submitButton)

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            })
        })
    })

    it('shows error message when login fails', async () => {
        const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'))

        const { authService } = require('@/lib/services/auth')
        authService.login.mockImplementation(mockLogin)

        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })

        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'wrongpassword')
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        })
    })

    it('disables submit button while loading', async () => {
        const mockLogin = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

        const { authService } = require('@/lib/services/auth')
        authService.login.mockImplementation(mockLogin)

        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })

        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'password123')
        await user.click(submitButton)

        expect(submitButton).toBeDisabled()
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })

    it('toggles password visibility', async () => {
        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const passwordInput = screen.getByLabelText(/password/i)
        const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

        expect(passwordInput).toHaveAttribute('type', 'password')

        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')

        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('navigates to register page', async () => {
        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const registerLink = screen.getByText(/sign up/i)
        expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('handles keyboard navigation', async () => {
        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)

        await user.tab()
        expect(emailInput).toHaveFocus()

        await user.tab()
        expect(passwordInput).toHaveFocus()

        await user.tab()
        expect(screen.getByRole('button', { name: /toggle password visibility/i })).toHaveFocus()

        await user.tab()
        expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })

    it('supports form submission with Enter key', async () => {
        const mockLogin = jest.fn().mockResolvedValue({
            user: global.testUtils.createMockUser(),
            token: 'mock-token',
        })

        const { authService } = require('@/lib/services/auth')
        authService.login.mockImplementation(mockLogin)

        const user = userEvent.setup()
        render(<MockedLoginForm />)

        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)

        await user.type(emailInput, 'test@example.com')
        await user.type(passwordInput, 'password123')
        await user.keyboard('{Enter}')

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            })
        })
    })
}) 
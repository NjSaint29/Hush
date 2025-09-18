import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-lg
            bg-gray-800 border border-gray-700
            text-gray-100 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
            transition-all duration-200
            ${error ? 'border-red-500 ring-1 ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400 animate-shake">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'